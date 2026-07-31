function pcmToWav(pcm: Uint8Array, rate = 24000) {
  const buffer = new ArrayBuffer(44 + pcm.length); const view = new DataView(buffer);
  const write = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  write(0,"RIFF"); view.setUint32(4,36+pcm.length,true); write(8,"WAVE"); write(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,rate,true); view.setUint32(28,rate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); write(36,"data"); view.setUint32(40,pcm.length,true); new Uint8Array(buffer,44).set(pcm); return new Uint8Array(buffer);
}
export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: "A chave Gemini ainda não foi configurada." }, { status: 503 });
    const { script } = await request.json() as { script?: string };
    if (!script || script.length < 80 || script.length > 32000) return Response.json({ error: "O roteiro deve ter entre 80 e 32.000 caracteres." }, { status: 400 });
    const prompt = `Produza um podcast natural em português brasileiro. Apresentador tem voz calorosa, clara e curiosa. Comentarista tem voz serena, segura e didática. Use ritmo conversacional, pausas naturais, entusiasmo moderado e respeito ao conteúdo bíblico. Leia exatamente o diálogo abaixo, sem anunciar os nomes dos participantes:\n\n${script}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{ responseModalities:["AUDIO"], speechConfig:{ multiSpeakerVoiceConfig:{ speakerVoiceConfigs:[{speaker:"Apresentador",voiceConfig:{prebuiltVoiceConfig:{voiceName:"Puck"}}},{speaker:"Comentarista",voiceConfig:{prebuiltVoiceConfig:{voiceName:"Kore"}}}] } } } }) });
    const data = await response.json() as any;
    if (!response.ok) return Response.json({ error: data?.error?.message || "A API Gemini recusou o áudio." }, { status: response.status });
    const part = data?.candidates?.[0]?.content?.parts?.find((p:any)=>p.inlineData?.data);
    if (!part) return Response.json({ error: "A API não retornou o áudio." }, { status: 502 });
    const pcm = Uint8Array.from(atob(part.inlineData.data),(c)=>c.charCodeAt(0)); const rate = Number(part.inlineData.mimeType?.match(/rate=(\d+)/)?.[1]||24000); const wav = pcmToWav(pcm,rate); let binary=""; for(let i=0;i<wav.length;i+=0x8000) binary+=String.fromCharCode(...wav.subarray(i,i+0x8000));
    return Response.json({audio:btoa(binary)});
  } catch { return Response.json({error:"Não foi possível gerar o podcast nesta tentativa."},{status:500}); }
}
