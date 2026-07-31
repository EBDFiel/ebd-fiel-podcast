function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").slice(0, 90000);
}

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: "A chave Gemini ainda não foi configurada no servidor." }, { status: 503 });
    const form = await request.formData();
    const mode = String(form.get("mode") || "text");
    const lessonNumber = String(form.get("lessonNumber") || "").replace(/[^0-9A-Za-z.-]/g, "").slice(0, 20);
    const title = String(form.get("title") || "Lição da semana").slice(0, 150);
    const publisher = String(form.get("publisher") || "Editora Betel").slice(0, 100);
    const className = String(form.get("className") || "Adultos");
    const requestedDuration = Number(form.get("duration")) || 10;
    const duration = [5, 10, 15, 20].includes(requestedDuration) ? requestedDuration : 10;
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
    const maximumWords: Record<number, number> = { 5: 520, 10: 1050, 15: 1570, 20: 2100 };
    const targetWords: Record<number, number> = { 5: 460, 10: 930, 15: 1400, 20: 1870 };
    const maxWords = maximumWords[duration];
    parts.push({ text: `Crie um roteiro ORIGINAL de podcast cristão em português brasileiro, com aproximadamente ${targetWords[duration]} palavras e NUNCA mais de ${maxWords} palavras, planejado para uma narração contínua que NÃO ultrapasse ${duration} minutos. Use linguagem clara, bíblica, pastoral, acolhedora e envolvente, destinada à classe ${className} da Escola Bíblica Dominical.

Dados da lição:
- Número: ${lessonNumber || "não informado"}
- Título: "${title}"
- Editora: "${publisher}"

Regras obrigatórias:
- Use somente ideias sustentadas pelo conteúdo-fonte. Não invente doutrinas, fatos ou citações.
- Não copie longos trechos; resuma, explique e aplique com redação própria.
- A conversa tem exatamente dois participantes identificados como "Débora:" e "Professor Fiel:".
- Débora é a apresentadora: acolhe, apresenta o assunto, conduz a conversa e faz transições naturais.
- Professor Fiel é um professor cristão: explica a Bíblia e a teologia com fidelidade às Escrituras, clareza, equilíbrio e aplicações concretas.
- Evite repetições, rodeios, saudações duplicadas e comentários que não contribuam para a lição.
- Organize obrigatoriamente o roteiro com os marcadores editoriais [INTRODUÇÃO], [DESENVOLVIMENTO] e [CONCLUSÃO], cada um em uma linha separada. Esses marcadores não serão narrados.

[INTRODUÇÃO]
- A primeira fala de Débora deve começar EXATAMENTE com: "A PAZ DO SENHOR JESUS A TODOS".
- Em seguida, ela apresenta o EBD Fiel Podcast e diz que hoje a EBD Fiel apresenta um resumo da Lição ${lessonNumber || "da semana"} – ${title}, da ${publisher}.
- Inclua uma chamada breve, natural e pastoral para acompanhar, compartilhar e divulgar no Instagram, TikTok e YouTube, explicando que isso ajuda a fortalecer a Escola Bíblica Dominical e espalhar a Palavra de Deus.

[DESENVOLVIMENTO]
- Identifique os tópicos existentes no conteúdo-fonte e comente cada um sequencialmente, respeitando rigorosamente a ordem original.
- Para CADA tópico, inclua: explicação bíblica e teológica clara e fiel às Escrituras; um exemplo prático do cotidiano cristão; e aplicações espirituais objetivas para a vida pessoal, a família e a igreja.
- Faça transições suaves entre os tópicos, mantendo a conversa natural e adequada para narração contínua.
- Distribua o espaço de forma equilibrada, sem permitir que os primeiros tópicos ocupem todo o tempo.

[CONCLUSÃO]
- Apresente um resumo claro e inspirador das principais lições aprendidas.
- Encoraje os ouvintes a perseverarem na fé, vivendo como novas criaturas em Cristo.
- Inclua uma palavra de ânimo para a semana que se inicia.
- Agradeça aos ouvintes e finalize com "FIQUEM COM DEUS!".
- A última fala deve encerrar exatamente com: "EBD Fiel — Fiel à Palavra."

- Não use efeitos sonoros, instruções de palco ou markdown além dos três marcadores editoriais exigidos.

Responda SOMENTE em JSON válido neste formato:
{"title":"título final","description":"descrição de até 240 caracteres","script":"[INTRODUÇÃO]\\nDébora: ...\\n\\nProfessor Fiel: ...\\n\\n[DESENVOLVIMENTO]\\n...\\n\\n[CONCLUSÃO]\\n..."}` });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.65 } }) });
    const data = await response.json() as any;
    if (!response.ok) return Response.json({ error: data?.error?.message || "A API Gemini recusou a solicitação." }, { status: response.status });
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed = JSON.parse(raw);
    if (!parsed.script) throw new Error("Roteiro ausente");
    const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
    if (countWords(parsed.script) > maxWords) {
      const compressionPrompt = `Reduza o roteiro abaixo para NO MÁXIMO ${maxWords} palavras, preservando obrigatoriamente os marcadores [INTRODUÇÃO], [DESENVOLVIMENTO] e [CONCLUSÃO], a ordem de todos os tópicos, as falas de Débora e Professor Fiel, a saudação inicial, as aplicações para vida pessoal, família e igreja, a palavra de ânimo e o encerramento "EBD Fiel — Fiel à Palavra.". Elimine repetições e detalhes secundários. Responda somente em JSON válido no formato {"title":"...","description":"...","script":"..."}.\n\nROTEIRO:\n${parsed.script}`;
      const compactResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: compressionPrompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.25 } }) });
      const compactData = await compactResponse.json() as any;
      if (compactResponse.ok) {
        const compactRaw = compactData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const compactParsed = JSON.parse(compactRaw);
        if (compactParsed.script && countWords(compactParsed.script) <= maxWords) parsed = compactParsed;
      }
    }
    const finalWordCount = countWords(parsed.script);
    if (finalWordCount > maxWords) return Response.json({ error: `O roteiro ultrapassou ${maxWords} palavras. Clique novamente para gerar uma versão mais objetiva.` }, { status: 422 });
    return Response.json({ title: parsed.title || title, description: parsed.description || "", script: parsed.script, wordCount: finalWordCount, estimatedSeconds: Math.ceil(finalWordCount / 105 * 60) });
  } catch (e) {
    return Response.json({ error: e instanceof Error && e.message.includes("fetch") ? "Não foi possível acessar a fonte informada." : "Não foi possível criar o roteiro nesta tentativa." }, { status: 500 });
  }
}
