// Coco, the AI tutor: a local model through Ollama on the computer (from Passeport civique).
// The web app calls Ollama directly; Ollama must allow this site (OLLAMA_ORIGINS, see Settings).
// Nothing is sent online. On a phone there is no Coco.
export const OLLAMA = 'http://localhost:11434';

// From biggest to smallest. minVram: advised video memory (GB).
export const MODELS = [
  { name: 'gemma4:26b', size: '≈ 19 Go', minVram: 20, desc: ['Le plus précis (24 Go de mémoire vidéo).', 'En isabetli (24 GB ekran belleği).'] },
  { name: 'gemma3:12b', size: '≈ 8 Go', minVram: 10, desc: ['Rapide et bon en turc (16 Go de mémoire vidéo).', 'Hızlı, Türkçesi iyi (16 GB ekran belleği).'] },
  { name: 'gemma4:e4b', size: '≈ 7 Go', minVram: 6, desc: ['Rapide, réponses plus simples (carte de 6 à 8 Go).', 'Hızlı, daha basit cevaplar (6-8 GB ekran kartı).'] },
  { name: 'gemma3:4b', size: '≈ 3,4 Go', minVram: 0, desc: ['Le plus léger, sans carte graphique (plus lent).', 'En hafif, ekran kartı olmadan (daha yavaş).'] },
];

// Graphics card reported by the browser, to advise a model.
export function gpuInfo() {
  let name = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  } catch { /* no WebGL */ }
  const dedicated = /nvidia|geforce|rtx|radeon rx|radeon pro|arc a\d|apple m\d/i.test(name);
  const parts = name.replace(/^ANGLE \((.*)\)$/, '$1').split(', ');
  const short = (parts.find((s) => /geforce|radeon|quadro|rtx|arc|iris|uhd|apple/i.test(s)) || parts[0] || '').replace(/\s*\(0x[0-9a-f]+\).*$/i, '').replace(/\s+Direct3D.*$/i, '').trim();
  return { name: short, dedicated };
}
export function recommendedModel(gpu = gpuInfo()) {
  const n = gpu.name;
  if (/rtx\s*(3090|4090|5090)|radeon rx 7900 xtx/i.test(n)) return 'gemma4:26b';
  if (/rtx\s*(3080|4080|5080|4070 ti super|5070 ti|4060 ti 16)|radeon rx (6800|6900|7800|7900|9070)/i.test(n)) return 'gemma3:12b';
  if (gpu.dedicated) return 'gemma4:e4b';
  return 'gemma3:4b';
}

export const hasModel = (status, name) => !!name && status.models?.some((m) => m.name === name || m.name === `${name}:latest`);

export async function getStatus() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const v = await fetch(`${OLLAMA}/api/version`, { signal: ctrl.signal });
    if (!v.ok) return { running: false, models: [] };
    const tags = await (await fetch(`${OLLAMA}/api/tags`)).json().catch(() => ({ models: [] }));
    return { running: true, version: (await v.json()).version, models: (tags.models || []).map((m) => ({ name: m.name, size: m.size })) };
  } catch {
    return { running: false, models: [] };
  } finally { clearTimeout(t); }
}

async function* ndjson(resp) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) yield JSON.parse(line);
    }
  }
  if (buf.trim()) yield JSON.parse(buf);
}

export async function pullModel(name, onProgress, signal) {
  const r = await fetch(`${OLLAMA}/api/pull`, { method: 'POST', body: JSON.stringify({ model: name, stream: true }), signal });
  if (!r.ok) throw new Error(await r.text());
  for await (const ev of ndjson(r)) {
    if (ev.error) throw new Error(ev.error);
    onProgress?.(ev);
  }
}

export async function chatStream({ model, messages, onToken, signal }) {
  const body = (think) => JSON.stringify({ model, messages, stream: true, keep_alive: '30m', ...(think === false ? { think: false } : {}), options: { temperature: 0.4, num_ctx: 8192 } });
  let r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: body(false), signal });
  if (!r.ok) {
    const err = await r.text();
    if (/think/i.test(err)) r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: body(undefined), signal }); // model without the think option
    else throw new Error(err);
    if (!r.ok) throw new Error(await r.text());
  }
  let full = '';
  for await (const ev of ndjson(r)) {
    if (ev.error) throw new Error(ev.error);
    const piece = ev.message?.content || '';
    if (piece) { full += piece; onToken?.(full); }
    if (ev.done) break;
  }
  return full;
}

export function systemPrompt(name) {
  return [
    `Tu es Coco, un coq sympathique et patient : le professeur de français de ${name || 'cette personne'}.`,
    'Sa langue maternelle est le turc. Elle débute en français (niveau A1) et vise le niveau A2.',
    'Elle aime les règles précises, présentées comme des formules, à la manière du Bescherelle, et les comparaisons avec la grammaire turque.',
    'Ton rôle : expliquer ses erreurs de conjugaison, de vocabulaire et de grammaire, donner la règle et des exemples simples, répondre à ses questions sur le français.',
    'Langue : réponds en turc. Écris tout ce qui est en français entre « » et donne la traduction turque des exemples.',
    'Règles :',
    '- Réponses courtes : 3 à 8 phrases ou une petite liste. Ton chaleureux et encourageant.',
    '- Donne la règle sous forme de formule quand c\'est possible (par exemple « futur = infinitif + ai, as, a, ons, ez, ont »).',
    '- Compare avec le turc quand cela aide (passé composé ≈ -di, imparfait ≈ -iyordu, « à » ≈ -e hâli).',
    '- Sois exact. La bonne réponse fournie dans le contexte est la référence : ne la contredis jamais. Si tu n\'es pas sûr, dis-le.',
    '- Pas de tableaux. Tu peux utiliser **gras** et des listes à puces.',
    '- Mets tout le français entre « », et rien d\'autre. N\'utilise pas de guillemets droits (").',
    '- N\'écris qu\'en turc et en français : jamais d\'anglais.',
  ].join('\n');
}

// Context of a conjugation table: expected forms and her answers.
export function tableContext({ verb, tenseName, rows, answers, grades }) {
  const lines = [`Exercice : conjugaison du verbe « ${verb.inf} » (${verb.tr}) au ${tenseName}.`, 'Forme attendue → sa réponse :'];
  rows.forEach((r, k) => {
    const g = grades?.[k];
    lines.push(`- ${r.label} « ${r.answer} » → « ${answers?.[r.i] || ''} » ${g ? (g.k === 'ok' ? 'juste' : g.k === 'near' ? `presque (${g.why})` : `faux${g.why ? ` (${g.why})` : ''}`) : ''}`);
  });
  return lines.join('\n');
}
export function taskContext({ prompt, text, model }) {
  return [`Exercice d'écriture (niveau A1-A2) : ${prompt}`, `Son texte : « ${text} »`, `Exemple de réponse possible : « ${model} »`,
    'Corrige ses fautes une par une (orthographe, accents, accords, conjugaison, articles) et explique chaque correction en turc, avec la règle.',
    'Puis réécris son texte corrigé en entier. Garde ses idées et ses phrases simples. Termine par un encouragement.'].join('\n');
}

export function wordContext({ w, answer, grade, expected }) {
  return [`Exercice : traduire « ${w.tr} » (turc) en français, avec l'article.`, `Réponse attendue : « ${expected} ».`,
    `Sa réponse : « ${answer || ''} » (${grade.k === 'ok' ? 'juste' : grade.k === 'near' ? `presque : ${grade.why}` : `faux${grade.why ? ` : ${grade.why}` : ''}`}).`,
    w.note ? `Remarque : ${w.note}` : ''].filter(Boolean).join('\n');
}
