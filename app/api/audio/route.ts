const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2;

function pcmToWav(pcm: Uint8Array, rate = SAMPLE_RATE) {
  const buffer = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.length, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, pcm.length, true);
  new Uint8Array(buffer, 44).set(pcm);
  return new Uint8Array(buffer);
}

function splitLongDialogueLine(line: string, maxChars: number) {
  if (line.length <= maxChars) return [line];
  const match = line.match(/^(Débora|Professor Fiel):\s*/i);
  const speaker = match?.[1] || "Professor Fiel";
  const content = line.slice(match?.[0].length || 0);
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];
  const pieces: string[] = [];
  let current = `${speaker}:`;
  for (const sentence of sentences) {
    if (`${current} ${sentence}`.length > maxChars && current.length > speaker.length + 1) {
      pieces.push(current.trim());
      current = `${speaker}: ${sentence.trim()}`;
    } else current += ` ${sentence.trim()}`;
  }
  if (current.trim().length > speaker.length + 1) pieces.push(current.trim());
  return pieces;
}

function makeChunks(script: string, maxChars = 3000) {
  const clean = script.replace(/^\s*\[(INTRODUÇÃO|DESENVOLVIMENTO|CONCLUSÃO)\]\s*$/gim, "").trim();
  const lines = clean.split(/\n+/).map(line => line.trim()).filter(Boolean).flatMap(line => splitLongDialogueLine(line, maxChars));
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current && `${current}\n\n${line}`.length > maxChars) {
      chunks.push(current);
      current = line;
    } else current += `${current ? "\n\n" : ""}${line}`;
  }
  if (current) chunks.push(current);
  return chunks;
}

function trimAndNormalizePcm(input: Uint8Array) {
  const evenLength = input.length - (input.length % 2);
  const view = new DataView(input.buffer, input.byteOffset, evenLength);
  const samples = evenLength / 2;
  const threshold = 160;
  let first = 0;
  let last = samples - 1;
  while (first < samples && Math.abs(view.getInt16(first * 2, true)) < threshold) first++;
  while (last > first && Math.abs(view.getInt16(last * 2, true)) < threshold) last--;
  const padding = Math.floor(SAMPLE_RATE * 0.12);
  first = Math.max(0, first - padding);
  last = Math.min(samples - 1, last + padding);

  const output = new Uint8Array((last - first + 1) * 2);
  const outputView = new DataView(output.buffer);
  const window = SAMPLE_RATE; let previousGain = 1;
  for (let start = first; start <= last; start += window) {
    const end = Math.min(last, start + window - 1); let sum = 0; let active = 0; let peak = 1;
    for (let index = start; index <= end; index++) { const value = view.getInt16(index * 2, true); const absolute = Math.abs(value); peak = Math.max(peak, absolute); if (absolute > 220) { sum += value * value; active++; } }
    const rms = active ? Math.sqrt(sum / active) : 4300; let desired = Math.min(2.4, Math.max(0.72, 4300 / rms)); desired = Math.min(desired, 30000 / peak); const gain = previousGain * .55 + desired * .45; previousGain = gain;
    for (let source = start; source <= end; source++) { const destination = source - first; const adjusted = Math.max(-32768, Math.min(32767, Math.round(view.getInt16(source * 2, true) * gain))); outputView.setInt16(destination * 2, adjusted, true); }
  }
  return output;
}

function concatenatePcm(parts: Uint8Array[]) {
  const silence = new Uint8Array(Math.floor(SAMPLE_RATE * BYTES_PER_SAMPLE * 0.18));
  const total = parts.reduce((sum, part) => sum + part.length, 0) + Math.max(0, parts.length - 1) * silence.length;
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part, index) => {
    output.set(part, offset); offset += part.length;
    if (index < parts.length - 1) { output.set(silence, offset); offset += silence.length; }
  });
  return output;
}

type VoiceEngine = "google" | "gemini";
type DialoguePart = { speaker: "Débora" | "Professor Fiel"; text: string };

function extractWavPcm(wav: Uint8Array) {
  if (wav.length < 44 || String.fromCharCode(...wav.subarray(0, 4)) !== "RIFF") return wav;
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunk = String.fromCharCode(...wav.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (chunk === "data") return wav.slice(offset + 8, Math.min(wav.length, offset + 8 + size));
    offset += 8 + size + (size % 2);
  }
  return wav.length > 44 ? wav.slice(44) : wav;
}

function splitPlainText(text: string, maxChars = 4200) {
  if (text.length <= maxChars) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (current && `${current} ${clean}`.length > maxChars) { parts.push(current); current = clean; }
    else current += `${current ? " " : ""}${clean}`;
  }
  if (current) parts.push(current);
  return parts;
}

function parseDialogue(script: string) {
  const clean = script.replace(/^\s*\[(INTRODUÇÃO|DESENVOLVIMENTO|CONCLUSÃO)\]\s*$/gim, "").trim();
  const matches = [...clean.matchAll(/(?:^|\n)\s*(Débora|Professor Fiel)\s*:\s*/gi)];
  const parts: DialoguePart[] = [];
  matches.forEach((match, index) => {
    const speaker = /^débora$/i.test(match[1]) ? "Débora" : "Professor Fiel";
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index! : clean.length;
    const text = clean.slice(start, end).trim();
    splitPlainText(text).forEach(piece => { if (piece) parts.push({ speaker, text: piece }); });
  });
  return parts;
}

async function generateGoogleAudio(script: string, presenterVoice: string, commentatorVoice: string) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("A chave GOOGLE_TTS_API_KEY ainda não foi configurada no Render.");
  const dialogue = parseDialogue(script);
  if (!dialogue.length) throw new Error('O roteiro precisa identificar as falas com "Débora:" e "Professor Fiel:".');

  const results = new Array<Uint8Array>(dialogue.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < dialogue.length) {
      const index = cursor++;
      const part = dialogue[index];
      const selected = part.speaker === "Débora" ? presenterVoice : commentatorVoice;
      let response: Response | null = null;
      let data: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            input: { text: part.text },
            voice: { languageCode: "pt-BR", name: `pt-BR-Chirp3-HD-${selected}` },
            audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE },
          }),
        });
        data = await response.json();
        if (response.ok) break;
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1800));
          continue;
        }
        break;
      }
      if (!response?.ok || !data?.audioContent) {
        const message = data?.error?.message || `O Google Cloud recusou a fala ${index + 1}.`;
        throw new Error(response?.status === 429 ? "O Google Cloud TTS atingiu o limite momentâneo. Aguarde um minuto e tente novamente." : `Google Cloud TTS: ${message}`);
      }
      const wav = Uint8Array.from(atob(data.audioContent), char => char.charCodeAt(0));
      results[index] = trimAndNormalizePcm(extractWavPcm(wav));
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, dialogue.length) }, () => worker()));
  return { pcm: concatenatePcm(results), chunks: dialogue.length };
}

async function generateGeminiAudio(script: string, presenterVoice: string, commentatorVoice: string, presenterStyle: string, commentatorStyle: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("A chave Gemini ainda não foi configurada.");
  const chunks = makeChunks(script, Math.max(3800, Math.ceil(script.length / 6)));
  if (!chunks.length) throw new Error("Não foi possível separar o roteiro para a narração.");
  const pcmParts: Uint8Array[] = [];
  for (let index = 0; index < chunks.length; index++) {
    if (index > 0 && index % 9 === 0) await new Promise(resolve => setTimeout(resolve, 62000));
    const prompt = `Este é o bloco ${index + 1} de ${chunks.length} de um único podcast cristão em português brasileiro. Preserve rigorosamente o mesmo timbre, ritmo e principalmente o MESMO VOLUME do início ao fim, sem reduzir a intensidade nas falas longas. Débora interpreta de forma ${presenterStyle.toLowerCase()}, participa, pergunta e comenta. Professor Fiel interpreta de forma ${commentatorStyle.toLowerCase()}, com projeção clara, constante, segura e plenamente audível. Use narração contínua, transições suaves, pausas naturais e respeito ao conteúdo bíblico. Leia somente o diálogo abaixo, sem anunciar os nomes dos participantes e sem acrescentar nenhuma fala:\n\n${chunks[index]}`;
    let response: Response | null = null;
    let data: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [{ speaker: "Débora", voiceConfig: { prebuiltVoiceConfig: { voiceName: presenterVoice } } }, { speaker: "Professor Fiel", voiceConfig: { prebuiltVoiceConfig: { voiceName: commentatorVoice } } }] } } } }) });
      data = await response.json();
      if (response.ok) break;
      if (response.status === 429 && attempt < 2) { const message = String(data?.error?.message || ""); const seconds = Number(message.match(/retry in ([0-9.]+)s/i)?.[1] || 60); await new Promise(resolve => setTimeout(resolve, Math.min(70000, Math.max(58000, (seconds + 3) * 1000)))); continue; }
      if (response.status >= 500 && attempt < 2) await new Promise(resolve => setTimeout(resolve, 1800));
    }
    if (!response?.ok) throw new Error(response?.status === 429 ? "O limite gratuito da voz Gemini está temporariamente ocupado. Use o Google Cloud TTS ou aguarde um minuto." : data?.error?.message || `A API Gemini recusou o bloco ${index + 1} do áudio.`);
    const audioPart = data?.candidates?.[0]?.content?.parts?.find((item: any) => item.inlineData?.data);
    if (!audioPart) throw new Error(`A API Gemini não retornou o bloco ${index + 1} do áudio.`);
    const rawPcm = Uint8Array.from(atob(audioPart.inlineData.data), char => char.charCodeAt(0));
    pcmParts.push(trimAndNormalizePcm(rawPcm));
  }
  return { pcm: concatenatePcm(pcmParts), chunks: chunks.length };
}

export async function POST(request: Request) {
  try {
    const { script, presenterVoice, commentatorVoice, presenterStyle, commentatorStyle, targetDuration, voiceEngine } = await request.json() as { script?: string; presenterVoice?: string; commentatorVoice?: string; presenterStyle?: string; commentatorStyle?: string; targetDuration?: number; voiceEngine?: VoiceEngine };
    if (!script || script.length < 80 || script.length > 32000) return Response.json({ error: "O roteiro deve ter entre 80 e 32.000 caracteres." }, { status: 400 });

    const selectedDuration = [5, 10, 15, 20].includes(Number(targetDuration)) ? Number(targetDuration) : 10;
    const maximumWords: Record<number, number> = { 5: 820, 10: 1600, 15: 2380, 20: 4000 };
    const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > maximumWords[selectedDuration]) return Response.json({ error: `O roteiro tem ${wordCount} palavras. O máximo para ${selectedDuration} minutos é ${maximumWords[selectedDuration]}.` }, { status: 422 });

    const voices = ["Zephyr","Puck","Charon","Kore","Fenrir","Leda","Orus","Aoede","Callirrhoe","Autonoe","Enceladus","Iapetus","Umbriel","Algieba","Despina","Erinome","Algenib","Rasalgethi","Laomedeia","Achernar","Alnilam","Schedar","Gacrux","Pulcherrima","Achird","Zubenelgenubi","Vindemiatrix","Sadachbia","Sadaltager","Sulafat"];
    const styles = ["Viva e envolvente", "Acolhedora", "Didática e pastoral", "Entusiasmada", "Serena", "Firme e pastoral"];
    const deboraVoice = voices.includes(presenterVoice || "") ? presenterVoice! : "Sadachbia";
    const professorVoice = voices.includes(commentatorVoice || "") ? commentatorVoice! : "Sadaltager";
    const deboraStyle = styles.includes(presenterStyle || "") ? presenterStyle! : "Viva e envolvente";
    const professorStyle = styles.includes(commentatorStyle || "") ? commentatorStyle! : "Didática e pastoral";
    const engine: VoiceEngine = voiceEngine === "gemini" ? "gemini" : "google";
    const generated = engine === "google"
      ? await generateGoogleAudio(script, deboraVoice, professorVoice)
      : await generateGeminiAudio(script, deboraVoice, professorVoice, deboraStyle, professorStyle);
    const combinedPcm = generated.pcm;
    const durationSeconds = combinedPcm.length / (SAMPLE_RATE * BYTES_PER_SAMPLE);
    const wav = pcmToWav(combinedPcm);
    let binary = "";
    for (let index = 0; index < wav.length; index += 0x8000) binary += String.fromCharCode(...wav.subarray(index, index + 0x8000));
    return Response.json({ audio: btoa(binary), durationSeconds: Math.round(durationSeconds), chunks: generated.chunks, engine });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível gerar o podcast nesta tentativa." }, { status: 500 });
  }
}
