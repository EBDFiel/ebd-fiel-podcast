"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CLASSES = ["Adultos", "Jovens", "Adolescentes", "Pré-adolescentes"];
const DURATIONS = [5, 10, 15, 20];
const MAX_WORDS: Record<number, number> = { 5: 820, 10: 1600, 15: 2380, 20: 4000 };
const MAX_READY_WORDS = 4000;
const VOICES = [
  ["Zephyr", "brilhante"], ["Puck", "animada"], ["Charon", "informativa"], ["Kore", "firme"], ["Fenrir", "empolgante"], ["Leda", "jovem"], ["Orus", "firme"], ["Aoede", "leve"], ["Callirrhoe", "tranquila"], ["Autonoe", "brilhante"], ["Enceladus", "suave"], ["Iapetus", "clara"], ["Umbriel", "descontraída"], ["Algieba", "macia"], ["Despina", "macia"], ["Erinome", "clara"], ["Algenib", "grave"], ["Rasalgethi", "informativa"], ["Laomedeia", "animada"], ["Achernar", "suave"], ["Alnilam", "firme"], ["Schedar", "equilibrada"], ["Gacrux", "madura"], ["Pulcherrima", "direta"], ["Achird", "amigável"], ["Zubenelgenubi", "casual"], ["Vindemiatrix", "gentil"], ["Sadachbia", "viva"], ["Sadaltager", "didática"], ["Sulafat", "acolhedora"],
].map(([id, quality]) => ({ id, label: `${id} — ${quality}` }));
const VOICE_STYLES = ["Viva e envolvente", "Acolhedora", "Didática e pastoral", "Entusiasmada", "Serena", "Firme e pastoral"];
const BUILTIN_MUSIC = [
  { id: "suave", label: "Instrumental suave", path: "/music/instrumental-suave.mp3" },
  { id: "piano", label: "Piano contemplativo", path: "/music/piano-contemplativo.mp3" },
  { id: "inspirador", label: "Ambiente inspirador", path: "/music/ambiente-inspirador.mp3" },
  { id: "solene", label: "Trilha solene", path: "/music/trilha-solene.mp3" },
];
const EXAMPLE = "A lição desta semana destaca a importância de ouvir a Palavra de Deus, compreender seus ensinamentos e aplicá-los de maneira prática. A fé cristã não se limita ao conhecimento, mas produz transformação, comunhão e serviço.";
const SCRIPT_TEMPLATE = `[INTRODUÇÃO]\nDébora: A PAZ DO SENHOR JESUS A TODOS! Sejam bem-vindos ao EBD Fiel Podcast.\n\nProfessor Fiel: A paz do Senhor, Débora. Hoje estudaremos uma lição muito importante.\n\n[DESENVOLVIMENTO]\nDébora: Professor Fiel, apresente o primeiro tópico da nossa lição.\n\nProfessor Fiel: Escreva aqui a explicação bíblica, o exemplo e as aplicações.\n\nDébora: Escreva aqui um comentário breve sobre o que foi explicado.\n\n[CONCLUSÃO]\nProfessor Fiel: Escreva aqui o resumo e a palavra de ânimo para a semana.\n\nDébora: Agradecemos a todos. FIQUEM COM DEUS! EBD Fiel — Fiel à Palavra.`;

function buildExternalPrompt(lessonNumber: string, lessonTitle: string, publisher: string, lessonClass: string) {
  return `Crie um roteiro de podcast cristão, com linguagem clara, acolhedora, envolvente e fiel às Escrituras, adequado para narração contínua com duas pessoas.

DADOS DA LIÇÃO
- Número: Lição ${lessonNumber || "[NÚMERO]"}
- Título: ${lessonTitle || "[TÍTULO DA LIÇÃO]"}
- Editora: ${publisher || "[EDITORA]"}
- Classe: ${lessonClass || "[CLASSE]"}

PERSONAGENS
- Débora: apresentadora. Ela conduz a conversa, faz perguntas e também comenta brevemente o que compreendeu das explicações, de maneira natural e edificante.
- Professor Fiel: professor cristão e comentarista. Ele explica, ensina e aplica cada tópico com clareza bíblica, teológica e pastoral.

FORMATAÇÃO OBRIGATÓRIA
- Escreva somente o roteiro final, sem observações externas.
- Identifique todas as falas exatamente com “Débora:” ou “Professor Fiel:”.
- Estruture obrigatoriamente em [INTRODUÇÃO], [DESENVOLVIMENTO] e [CONCLUSÃO].
- Mantenha transições suaves e uma conversa natural, sem repetições desnecessárias.
- Comente todos os tópicos e subtópicos da lição na ordem original.

PRONÚNCIA DAS REFERÊNCIAS BÍBLICAS
- Escreva todas as referências bíblicas por extenso, exatamente como devem ser pronunciadas na narração.
- Nunca use ponto, dois-pontos, vírgula ou hífen para separar capítulo e versículo nas falas.
- Exemplo: “Provérbios 3.9” deve se tornar “Provérbios, capítulo 3, versículo 9”.
- Exemplo: “João 3.16-17” deve se tornar “João, capítulo 3, versículos 16 e 17”.
- Exemplo: “Romanos 8.1,2” deve se tornar “Romanos, capítulo 8, versículos 1 e 2”.
- Exemplo: “Salmos 23.1-4” deve se tornar “Salmos, capítulo 23, do versículo 1 ao 4”.
- Aplique essa conversão a todas as referências citadas no roteiro, preservando corretamente o nome do livro, o capítulo e os versículos.

[INTRODUÇÃO]
- Débora deve iniciar exatamente com: “A PAZ DO SENHOR JESUS A TODOS”.
- Apresente o EBD Fiel Podcast e informe que hoje a EBD Fiel apresenta um resumo da Lição ${lessonNumber || "[NÚMERO]"} – ${lessonTitle || "[TÍTULO]"}, da ${publisher || "[EDITORA]"}.
- Convide naturalmente os ouvintes a acompanhar, compartilhar e divulgar o conteúdo no Instagram, TikTok e YouTube, destacando a importância de fortalecer a Escola Bíblica Dominical e espalhar a Palavra de Deus.

[DESENVOLVIMENTO]
Comente cada tópico e subtópico sequencialmente. Em cada um, inclua:
- explicação bíblica e teológica clara e fiel às Escrituras;
- exemplos práticos do cotidiano cristão;
- aplicações espirituais para a vida pessoal, a família e a igreja;
- uma pergunta ou transição de Débora;
- uma explicação completa do Professor Fiel;
- uma breve compreensão ou aplicação comentada por Débora após a explicação.

[CONCLUSÃO]
- Apresente um resumo claro e inspirador das principais lições.
- Encoraje os ouvintes a perseverarem na fé e viverem como novas criaturas em Cristo.
- Inclua uma palavra de ânimo para a semana que se inicia.
- Débora deve agradecer aos ouvintes e dizer: “FIQUEM COM DEUS!”.
- Termine exatamente com: “EBD Fiel — Fiel à Palavra.”

CONTEÚDO-BASE DA LIÇÃO
[COLE AQUI O CONTEÚDO COMPLETO DA LIÇÃO, OS TÓPICOS, SUBTÓPICOS E REFERÊNCIAS BÍBLICAS]`;
}

type HistoryItem = { title: string; date: string; duration: number };

function fmt(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function audioBufferToWav(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0); const bytes = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(bytes);
  const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true)); return new Blob([bytes], { type: "audio/wav" });
}

export default function Home() {
  const [workflowMode, setWorkflowMode] = useState<"ai" | "ready">("ai");
  const [sourceMode, setSourceMode] = useState<"text" | "pdf" | "url">("text");
  const [sourceText, setSourceText] = useState(EXAMPLE);
  const [readyScript, setReadyScript] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lessonNumber, setLessonNumber] = useState("5");
  const [lessonTitle, setLessonTitle] = useState("A disciplina do Senhor conduz à vida");
  const [publisher, setPublisher] = useState("Editora Betel");
  const [lessonClass, setLessonClass] = useState("Adultos");
  const [targetDuration, setTargetDuration] = useState(10);
  const [voiceEngine, setVoiceEngine] = useState<"google" | "gemini">("google");
  const [presenterVoice, setPresenterVoice] = useState("Sadachbia");
  const [commentatorVoice, setCommentatorVoice] = useState("Sadaltager");
  const [presenterStyle, setPresenterStyle] = useState("Viva e envolvente");
  const [commentatorStyle, setCommentatorStyle] = useState("Didática e pastoral");
  const [musicMode, setMusicMode] = useState<"none" | "music">("none");
  const [musicSource, setMusicSource] = useState<"library" | "upload">("library");
  const [selectedMusic, setSelectedMusic] = useState(BUILTIN_MUSIC[0].path);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(8);
  const [mixedAudioUrl, setMixedAudioUrl] = useState("");
  const [mixing, setMixing] = useState(false);
  const [script, setScript] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState<"script" | "audio" | "">("");
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("ebd-podcast-history") || "[]")); } catch { setHistory([]); }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => () => { if (mixedAudioUrl) URL.revokeObjectURL(mixedAudioUrl); }, [mixedAudioUrl]);

  const words = useMemo(() => script.trim() ? script.trim().split(/\s+/).length : 0, [script]);
  const scriptMinutes = Math.max(1, Math.ceil(words / 160));
  const readyWords = useMemo(() => readyScript.trim() ? readyScript.trim().split(/\s+/).length : 0, [readyScript]);
  const readyMinutes = Math.max(1, Math.ceil(readyWords / 160));
  const externalPrompt = useMemo(() => buildExternalPrompt(lessonNumber, lessonTitle, publisher, lessonClass), [lessonNumber, lessonTitle, publisher, lessonClass]);

  async function copyExternalPrompt() {
    try {
      await navigator.clipboard.writeText(externalPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2200);
    } catch { setError("Não foi possível copiar automaticamente. Selecione o texto do modelo e copie manualmente."); }
  }

  async function createScript() {
    if (sourceMode === "text" && sourceText.trim().length < 40) return setError("Cole um conteúdo maior para gerar um roteiro fiel.");
    if (sourceMode === "pdf" && !file) return setError("Selecione o PDF da lição.");
    if (sourceMode === "url" && !sourceUrl.startsWith("http")) return setError("Informe um endereço válido começando com https://");
    setLoading("script"); setError("");
    try {
      const form = new FormData();
      form.set("mode", sourceMode); form.set("text", sourceText); form.set("url", sourceUrl);
      form.set("lessonNumber", lessonNumber); form.set("title", lessonTitle); form.set("publisher", publisher);
      form.set("className", lessonClass); form.set("duration", String(targetDuration));
      if (file) form.set("file", file);
      const response = await fetch("/api/script", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível criar o roteiro.");
      setScript(data.script); setDescription(data.description || ""); setLessonTitle(data.title || lessonTitle); setStep(2);
      setTimeout(() => document.getElementById("roteiro")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setLoading(""); }
  }

  function useReadyScript() {
    const clean = readyScript.trim(); setError("");
    if (clean.length < 80) return setError("Cole um roteiro maior antes de continuar.");
    if (!/(^|\n)\s*Débora\s*:/i.test(clean)) return setError('Inclua pelo menos uma fala iniciada por "Débora:".');
    if (!/(^|\n)\s*Professor Fiel\s*:/i.test(clean)) return setError('Inclua pelo menos uma fala iniciada por "Professor Fiel:".');
    if (readyWords > MAX_READY_WORDS) return setError("O roteiro pronto deve ter no máximo 4.000 palavras para esta versão.");
    const closestDuration = readyWords <= 820 ? 5 : readyWords <= 1600 ? 10 : readyWords <= 2380 ? 15 : 20;
    setTargetDuration(closestDuration); setScript(clean); setDescription("Roteiro pronto enviado pelo usuário."); setStep(2);
    setTimeout(() => document.getElementById("roteiro")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function createAudio() {
    if (script.trim().length < 80) return setError("Revise o roteiro antes de gerar o áudio.");
    setLoading("audio"); setError("");
    try {
      if (words > MAX_WORDS[targetDuration]) return setError(workflowMode === "ready" ? `O roteiro tem ${words} palavras. Reduza para no máximo ${MAX_READY_WORDS} palavras.` : `O roteiro tem ${words} palavras. Para ${targetDuration} minutos, reduza para no máximo ${MAX_WORDS[targetDuration]} palavras.`);
      const response = await fetch("/api/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script, presenterVoice, commentatorVoice, presenterStyle, commentatorStyle, targetDuration, voiceEngine }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o podcast.");
      const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "audio/wav" });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob); setAudioUrl(url); setStep(3);
      if (data.durationSeconds) setDuration(Number(data.durationSeconds));
      const item = { title: lessonTitle, date: new Date().toLocaleDateString("pt-BR"), duration: targetDuration };
      const next = [item, ...history].slice(0, 6); setHistory(next); localStorage.setItem("ebd-podcast-history", JSON.stringify(next));
      setTimeout(() => { document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }); audioRef.current?.play(); }, 120);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setLoading(""); }
  }

  function copyShareText() {
    navigator.clipboard.writeText(`🎙️ *EBD Fiel Podcast*\n\n*${lessonTitle}*\n${description}\n\nOuça e compartilhe com sua classe.`);
  }

  async function mixWithMusic() {
    if (!audioUrl || (musicSource === "upload" && !musicFile)) return setError("Escolha primeiro uma música MP3 ou WAV.");
    if (musicSource === "upload" && musicFile && musicFile.size > 25 * 1024 * 1024) return setError("A música deve ter no máximo 25 MB.");
    setMixing(true); setError("");
    try {
      const musicBytes: ArrayBuffer = musicSource === "library" ? await (await fetch(selectedMusic)).arrayBuffer() : await musicFile!.arrayBuffer();
      const context = new AudioContext(); const [voice, music] = await Promise.all([context.decodeAudioData(await (await fetch(audioUrl)).arrayBuffer()), context.decodeAudioData(musicBytes)]); await context.close();
      const offline = new OfflineAudioContext(1, Math.ceil(voice.duration * 24000), 24000); const voiceSource = offline.createBufferSource(); voiceSource.buffer = voice; const voiceGain = offline.createGain(); voiceGain.gain.value = 1; voiceSource.connect(voiceGain);
      const musicNode = offline.createBufferSource(); musicNode.buffer = music; musicNode.loop = true; const musicGain = offline.createGain(); const level = musicVolume / 100; musicGain.gain.setValueAtTime(0, 0); musicGain.gain.linearRampToValueAtTime(level, Math.min(2, voice.duration / 4)); musicGain.gain.setValueAtTime(level, Math.max(2, voice.duration - 2)); musicGain.gain.linearRampToValueAtTime(0, voice.duration); musicNode.connect(musicGain);
      const compressor = offline.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.ratio.value = 4; voiceGain.connect(compressor); musicGain.connect(compressor); compressor.connect(offline.destination); voiceSource.start(); musicNode.start();
      const rendered = await offline.startRendering(); if (mixedAudioUrl) URL.revokeObjectURL(mixedAudioUrl); setMixedAudioUrl(URL.createObjectURL(audioBufferToWav(rendered)));
    } catch { setError("Não foi possível misturar essa música. Tente um arquivo MP3 ou WAV diferente."); } finally { setMixing(false); }
  }

  return <main>
    <header><div className="shell nav"><div className="brand"><img className="brandLogo" src="/icon-192.png" alt="Logo Podcast EBD Fiel"/><div><strong>EBD Fiel</strong><small>Podcast da Lição</small></div></div><span className="private"><i /> Uso particular EBD Fiel</span></div></header>

    <section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">✦ CONTEÚDO QUE EDIFICA, VOZES QUE CONECTAM</div><h1>Transforme a lição da semana em uma <em>conversa que inspira.</em></h1><p>Envie o conteúdo, revise o roteiro e produza um podcast com duas vozes naturais para sua Escola Bíblica Dominical.</p><div className="features"><span>◉ Duas vozes</span><span>✎ Roteiro revisável</span><span>↓ Download em WAV</span></div></div><div className="podcastArt"><div className="ring r1"/><div className="ring r2"/><div className="mic">🎙</div><div className="wave"><b/><b/><b/><b/><b/><b/><b/></div><small>ESTÚDIO EBD FIEL</small></div></div></section>

    <section className="shell workspace">
      <nav className="steps"><button className={step >= 1 ? "active" : ""} onClick={() => setStep(1)}><b>1</b><span>Conteúdo<small>Envie a lição</small></span></button><i/><button className={step >= 2 ? "active" : ""} disabled={!script} onClick={() => setStep(2)}><b>2</b><span>Roteiro<small>Revise a conversa</small></span></button><i/><button className={step >= 3 ? "active" : ""} disabled={!audioUrl} onClick={() => setStep(3)}><b>3</b><span>Podcast<small>Ouça e baixe</small></span></button></nav>

      <section className="panel" id="conteudo">
        <div className="panelTitle"><span>1</span><div><h2>{workflowMode === "ai" ? "Adicione a lição da semana" : "Cole seu roteiro pronto"}</h2><p>{workflowMode === "ai" ? "O conteúdo será usado como fonte para um roteiro original e fiel ao tema." : "Use um roteiro já preparado e siga diretamente para as vozes."}</p></div></div>
        <div className="sourceTabs"><button className={workflowMode === "ai" ? "active" : ""} onClick={() => setWorkflowMode("ai")}>✦ Criar roteiro com IA</button><button className={workflowMode === "ready" ? "active" : ""} onClick={() => setWorkflowMode("ready")}>▤ Colar roteiro pronto</button></div>
        {workflowMode === "ai" ? <>
          <div className="sourceTabs"><button className={sourceMode === "text" ? "active" : ""} onClick={() => setSourceMode("text")}>✎ Colar texto</button><button className={sourceMode === "pdf" ? "active" : ""} onClick={() => setSourceMode("pdf")}>▣ Enviar PDF</button><button className={sourceMode === "url" ? "active" : ""} onClick={() => setSourceMode("url")}>↗ Usar endereço</button></div>
          {sourceMode === "text" && <div className="textBox"><textarea value={sourceText} onChange={e => setSourceText(e.target.value)} maxLength={30000} placeholder="Cole o conteúdo da lição, subsídios ou anotações..."/><small>{sourceText.length.toLocaleString("pt-BR")} / 30.000 caracteres</small></div>}
          {sourceMode === "pdf" && <label className="drop"><input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)}/><b>↑</b><strong>{file ? file.name : "Selecione o PDF da lição"}</strong><span>Arquivo PDF de até 15 MB</span></label>}
          {sourceMode === "url" && <label className="urlInput"><span>Endereço da página</span><input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://exemplo.com/licao-da-semana"/></label>}
        </> : <><div className="textBox"><textarea value={readyScript} onChange={e => setReadyScript(e.target.value)} maxLength={30000} placeholder={'Cole o roteiro usando "Débora:" e "Professor Fiel:" antes de cada fala.'}/><small>{readyWords.toLocaleString("pt-BR")} palavras • aproximadamente {readyMinutes} min</small></div><div className="readyHelper"><span>O roteiro pronto não utiliza a IA do aplicativo para escrever.</span><div><button className="secondary" onClick={() => setReadyScript(SCRIPT_TEMPLATE)}>Carregar modelo simples</button><button className="secondary promptToggle" onClick={() => setPromptOpen(value => !value)}>{promptOpen ? "Fechar modelo para o GPT" : "Ver modelo para o GPT"}</button></div></div>{promptOpen && <div className="promptModel"><div><div><strong>Modelo de prompt para gerar o roteiro</strong><small>Os dados da lição preenchidos abaixo entram automaticamente no modelo.</small></div><button onClick={copyExternalPrompt}>{promptCopied ? "✓ Prompt copiado" : "▣ Copiar prompt"}</button></div><textarea readOnly value={externalPrompt}/><p>Copie este modelo, cole no ChatGPT e substitua o trecho final pelo conteúdo completo da lição. Depois, cole aqui o roteiro gerado.</p></div>}</>}
        <div className="lessonMetaGrid">
          <label><span>Número da lição</span><input value={lessonNumber} onChange={e => setLessonNumber(e.target.value)} placeholder="Ex.: 5"/></label>
          <label><span>Título da lição</span><input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Digite o título"/></label>
          <label><span>Editora</span><input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Ex.: Editora Betel"/></label>
          <label><span>Classe</span><select value={lessonClass} onChange={e => setLessonClass(e.target.value)}>{CLASSES.map(c => <option key={c}>{c}</option>)}</select></label>
        </div>
        {workflowMode === "ai" && <div className="durationSection"><span>Duração aproximada do podcast</span><div className="durationButtons">{DURATIONS.map(d => <button type="button" className={targetDuration === d ? "active" : ""} onClick={() => setTargetDuration(d)} key={d}>{d} min</button>)}</div><small>O tempo é uma referência e pode variar conforme a voz, o ritmo e o conteúdo da lição.</small></div>}
        <div className="actionRow"><p>{workflowMode === "ai" ? "O roteiro será um resumo conversacional original, não uma cópia do material." : "A duração será calculada automaticamente pela quantidade de palavras."}</p>{workflowMode === "ai" ? <button className="primary" onClick={createScript} disabled={!!loading}>{loading === "script" ? <><i className="spin"/> Criando roteiro...</> : <>✦ Criar roteiro com IA</>}</button> : <button className="primary" onClick={useReadyScript}>Continuar com este roteiro →</button>}</div>
      </section>

      {error && <div className="error" role="alert"><b>!</b><span>{error}</span></div>}

      {script && <section className="panel scriptPanel" id="roteiro">
        <div className="panelTitle"><span>2</span><div><h2>Revise o roteiro</h2><p>Faça os ajustes necessários antes de transformar a conversa em áudio.</p></div><div className={`scriptStats ${words > MAX_WORDS[targetDuration] ? "overLimit" : ""}`}><b>{words}</b> / {MAX_WORDS[targetDuration]} palavras <i/> aproximadamente {workflowMode === "ready" ? scriptMinutes : targetDuration} min</div></div>
        <div className="speakers"><span><i className="host">D</i><b>Débora</b> apresenta e conduz</span><span><i className="guest">F</i><b>Professor Fiel</b> comenta e ensina</span></div>
        <div className="durationSection"><span>Mecanismo de voz</span><div className="durationButtons"><button type="button" className={voiceEngine === "google" ? "active" : ""} onClick={() => setVoiceEngine("google")}>Google Cloud TTS — econômico</button><button type="button" className={voiceEngine === "gemini" ? "active" : ""} onClick={() => setVoiceEngine("gemini")}>Gemini TTS — expressivo</button></div><small>{voiceEngine === "google" ? "Recomendado: geração mais estável, volume uniforme e uso da cota mensal do Google Cloud." : "Voz mais interpretativa, porém sujeita ao limite de requisições gratuitas do Gemini."}</small></div>
        <div className="voiceGrid">
          <div className="voiceCard"><strong>Débora</strong><small>Apresenta, pergunta e comenta</small><label><span>Voz</span><select value={presenterVoice} onChange={e => setPresenterVoice(e.target.value)}>{VOICES.map(voice => <option value={voice.id} key={voice.id}>{voice.label}</option>)}</select></label><label><span>Interpretação</span><select value={presenterStyle} onChange={e => setPresenterStyle(e.target.value)}>{VOICE_STYLES.map(style => <option key={style}>{style}</option>)}</select></label></div>
          <div className="voiceCard"><strong>Professor Fiel</strong><small>Explica, ensina e aplica</small><label><span>Voz</span><select value={commentatorVoice} onChange={e => setCommentatorVoice(e.target.value)}>{VOICES.map(voice => <option value={voice.id} key={voice.id}>{voice.label}</option>)}</select></label><label><span>Interpretação</span><select value={commentatorStyle} onChange={e => setCommentatorStyle(e.target.value)}>{VOICE_STYLES.map(style => <option key={style}>{style}</option>)}</select></label></div>
        </div>
        <div className="economyNotice"><b>{voiceEngine === "google" ? "Google Cloud TTS selecionado" : "Gemini TTS selecionado"}</b><span>{voiceEngine === "google" ? "Cada participante será gerado com voz própria e volume normalizado em um único arquivo WAV." : "As amostras permanecem desativadas para reservar a cota Gemini para o podcast completo."}</span></div>
        <textarea className="scriptEditor" value={script} onChange={e => setScript(e.target.value)} aria-label="Roteiro do podcast"/>
        <div className="actionRow"><button className="secondary" onClick={() => setStep(1)}>← Voltar ao conteúdo</button><button className="primary gold" onClick={createAudio} disabled={!!loading}>{loading === "audio" ? <><i className="spin dark"/> Gerando em blocos; aguarde...</> : <>🎙 Gerar com {voiceEngine === "google" ? "Google Cloud" : "Gemini"}</>}</button></div>
      </section>}

      {audioUrl && <section className="panel resultPanel" id="resultado">
        <audio ref={audioRef} src={audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onEnded={() => setPlaying(false)}/>
        <div className="cover"><div className="miniMic">🎙</div><span>EBD FIEL PODCAST</span><h3>{lessonTitle}</h3><small>{lessonClass} • Lição da semana</small></div>
        <div className="resultContent"><div className="success">✓ Podcast gerado com sucesso</div><h2>{lessonTitle}</h2><p>{description}</p><div className="player"><button onClick={() => audioRef.current?.paused ? audioRef.current.play() : audioRef.current?.pause()}>{playing ? "Ⅱ" : "▶"}</button><div><input type="range" min="0" max={duration || 0} value={current} onChange={e => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}/><span>{fmt(current)} <i/> {fmt(duration)}</span></div></div><div className="musicStudio"><strong>Música de fundo (opcional)</strong><div className="musicModes"><button className={musicMode === "none" ? "active" : ""} onClick={() => setMusicMode("none")}>Sem música</button><button className={musicMode === "music" ? "active" : ""} onClick={() => setMusicMode("music")}>Com música</button></div>{musicMode === "music" && <><div className="musicSource"><button className={musicSource === "library" ? "active" : ""} onClick={() => { setMusicSource("library"); setMixedAudioUrl(""); }}>Biblioteca do aplicativo</button><button className={musicSource === "upload" ? "active" : ""} onClick={() => { setMusicSource("upload"); setMixedAudioUrl(""); }}>Enviar minha música</button></div><div className="musicPreview">{musicSource === "library" ? <><select value={selectedMusic} onChange={e => { setSelectedMusic(e.target.value); setMixedAudioUrl(""); }}>{BUILTIN_MUSIC.map(track => <option value={track.path} key={track.id}>{track.label}</option>)}</select><audio controls src={selectedMusic}/><small>Trilhas instrumentais originais do aplicativo.</small></> : <label><input type="file" accept="audio/mpeg,audio/wav" onChange={e => { setMusicFile(e.target.files?.[0] || null); setMixedAudioUrl(""); }}/><span>{musicFile?.name || "Escolher MP3 ou WAV"}</span></label>}</div><div className="musicControls"><div><span>Volume da música: {musicVolume}%</span><input type="range" min="2" max="20" value={musicVolume} onChange={e => { setMusicVolume(Number(e.target.value)); setMixedAudioUrl(""); }}/></div><button onClick={mixWithMusic} disabled={mixing || (musicSource === "upload" && !musicFile)}>{mixing ? "Misturando..." : "♫ Criar versão com música"}</button></div></>}</div><div className="downloadRow"><a href={mixedAudioUrl || audioUrl} download={`ebd-fiel-podcast-${Date.now()}.wav`}>↓ Baixar {mixedAudioUrl ? "com música" : "podcast"}</a><button onClick={copyShareText}>▣ Copiar texto para WhatsApp</button></div></div>
      </section>}

      {history.length > 0 && <section className="history"><h2>Histórico neste dispositivo</h2><div>{history.map((item, i) => <article key={i}><span>🎧</span><div><b>{item.title}</b><small>{item.date} • {item.duration} minutos</small></div></article>)}</div></section>}
    </section>
    <footer><div className="shell"><div className="brand"><img className="brandLogo footerLogo" src="/icon-192.png" alt="Logo Podcast EBD Fiel"/><div><strong>EBD Fiel</strong><small>Ensino bíblico que transforma</small></div></div><p>Ferramenta de uso particular • EBD Fiel © 2026</p></div></footer>
  </main>;
}
