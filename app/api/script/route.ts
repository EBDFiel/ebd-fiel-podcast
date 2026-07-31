function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").slice(0, 90000);
}

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: "A chave Gemini ainda não foi configurada no servidor." }, { status: 503 });
    const form = await request.formData();
    const mode = String(form.get("mode") || "text");
    const title = String(form.get("title") || "Lição da semana").slice(0, 150);
    const className = String(form.get("className") || "Adultos");
    const duration = Math.min(20, Math.max(5, Number(form.get("duration")) || 10));
    const parts: any[] = [];
    if (mode === "pdf") {
      const file = form.get("file");
      if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 15 * 1024 * 1024) return Response.json({ error: "Envie um PDF válido de até 15 MB." }, { status: 400 });
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      parts.push({ inlineData: { mimeType: "application/pdf", data: btoa(binary) } });
    } else if (mode === "url") {
      const raw = String(form.get("url") || ""); const url = new URL(raw);
      if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) return Response.json({ error: "Use um endereço público com https://" }, { status: 400 });
      const page = await fetch(url, { headers: { "User-Agent": "EBD-Fiel-Podcast/1.0" } });
      if (!page.ok) return Response.json({ error: "Não foi possível acessar a página informada." }, { status: 400 });
      parts.push({ text: `CONTEÚDO DA PÁGINA:\n${stripHtml(await page.text())}` });
    } else {
      const text = String(form.get("text") || "").slice(0, 30000);
      if (text.trim().length < 40) return Response.json({ error: "Forneça um conteúdo maior." }, { status: 400 });
      parts.push({ text: `CONTEÚDO-FONTE:\n${text}` });
    }
    const targetWords = duration * 115;
    parts.push({ text: `Crie um roteiro ORIGINAL de podcast em português brasileiro com aproximadamente ${targetWords} palavras, destinado à classe ${className} da Escola Bíblica Dominical. Título informado: "${title}".

Regras obrigatórias:
- Use somente ideias sustentadas pelo conteúdo-fonte. Não invente doutrinas, fatos ou citações.
- Não copie longos trechos; resuma, explique e aplique com redação própria.
- A conversa tem exatamente dois participantes identificados como "Débora:" e "Professor Fiel:".
- Débora é a apresentadora: acolhe, apresenta o assunto, conduz a conversa e faz perguntas naturais.
- Professor Fiel é o comentarista: explica biblicamente com clareza e aplicações concretas.
- Inclua uma abertura curta de Débora: "Olá, seja bem-vindo ao EBD Fiel Podcast".
- Desenvolva 3 ou 4 blocos em diálogo fluido, sem títulos técnicos no meio da conversa.
- Encerre convidando o ouvinte a estudar a lição e participar da EBD.
- Sem instruções de palco, colchetes, efeitos sonoros ou markdown.

Responda SOMENTE em JSON válido neste formato:
{"title":"título final","description":"descrição de até 240 caracteres","script":"Débora: ...\\n\\nProfessor Fiel: ..."}` });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.65 } }) });
    const data = await response.json() as any;
    if (!response.ok) return Response.json({ error: data?.error?.message || "A API Gemini recusou a solicitação." }, { status: response.status });
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(raw);
    if (!parsed.script) throw new Error("Roteiro ausente");
    return Response.json({ title: parsed.title || title, description: parsed.description || "", script: parsed.script });
  } catch (e) {
    return Response.json({ error: e instanceof Error && e.message.includes("fetch") ? "Não foi possível acessar a fonte informada." : "Não foi possível criar o roteiro nesta tentativa." }, { status: 500 });
  }
}
