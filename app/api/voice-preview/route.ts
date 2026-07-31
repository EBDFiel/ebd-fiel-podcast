const RATE = 24000;
const VOICES = ["Zephyr","Puck","Charon","Kore","Fenrir","Leda","Orus","Aoede","Callirrhoe","Autonoe","Enceladus","Iapetus","Umbriel","Algieba","Despina","Erinome","Algenib","Rasalgethi","Laomedeia","Achernar","Alnilam","Schedar","Gacrux","Pulcherrima","Achird","Zubenelgenubi","Vindemiatrix","Sadachbia","Sadaltager","Sulafat"];

function pcmToWav(pcm: Uint8Array) {
  const buffer = new ArrayBuffer(44 + pcm.length); const view = new DataView(buffer); const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.length, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, RATE, true); view.setUint32(28, RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, pcm.length, true); new Uint8Array(buffer, 44).set(pcm); return new Uint8Array(buffer);
}

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY; if (!key) return Response.json({ error: "A chave Gemini ainda não foi configurada." }, { status: 503 });
    const body = await request.json() as { voice?: string; role?: string; style?: string }; const voice = VOICES.includes(body.voice || "") ? body.voice! : "Kore"; const role = body.role === "Professor Fiel" ? "Professor Fiel" : "Débora"; const text = role === "Débora" ? "A paz do Senhor Jesus a todos. Seja bem-vindo ao EBD Fiel Podcast." : "Hoje vamos compreender a lição bíblica com clareza e aplicar seus ensinamentos à nossa vida.";
    const prompt = `Fale em português brasileiro. Você representa ${role}, em estilo ${String(body.style || "natural").toLowerCase()}. Use voz clara, viva, natural e volume constante. Leia somente: ${text}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) });
    const data = await response.json() as any; if (!response.ok) return Response.json({ error: data?.error?.message || "Não foi possível gerar a amostra." }, { status: response.status }); const encoded = data?.candidates?.[0]?.content?.parts?.find((item: any) => item.inlineData?.data)?.inlineData?.data; if (!encoded) return Response.json({ error: "A API não retornou a amostra." }, { status: 502 });
    const wav = pcmToWav(Uint8Array.from(atob(encoded), char => char.charCodeAt(0))); let binary = ""; for (let index = 0; index < wav.length; index += 0x8000) binary += String.fromCharCode(...wav.subarray(index, index + 0x8000)); return Response.json({ audio: btoa(binary) });
  } catch { return Response.json({ error: "Não foi possível gerar a amostra nesta tentativa." }, { status: 500 }); }
}
