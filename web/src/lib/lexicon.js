// Word by word: cut a French text into words (from Passeport civique), and look a word up in the lexicon
// (public/lexicon.json, built by scripts/build-words.mjs from Lexique 3.83), loaded on the first tap.

// A word: letters, possibly joined by an apostrophe or a hyphen (l'égalité, peut-être).
const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;
// Elided articles and pronouns: "l'égalité" is looked up as "égalité".
const ELISION = /^(?:l|d|j|n|s|c|m|t|qu|jusqu|lorsqu|puisqu|quoiqu)'(?=[\p{L}])/u;

export function tokenize(text) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(WORD)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false });
  return out;
}
export const wordKey = (w) => w.toLowerCase().replace(/’/g, "'").replace(ELISION, '').replace(/œ/g, 'oe');

let lexicon = null;
export function loadLexicon() {
  if (!lexicon) {
    lexicon = fetch('./lexicon.json').then((r) => { if (!r.ok) throw new Error('lexicon'); return r.json(); });
    lexicon.catch(() => { lexicon = null; });
  }
  return lexicon;
}

const CAT = { n: ['nom', 'isim'], v: ['verbe', 'fiil'], a: ['adjectif', 'sıfat'], d: ['adverbe', 'zarf'], p: ['préposition', 'edat'], c: ['conjonction', 'bağlaç'],
  r: ['pronom', 'zamir'], t: ['déterminant', 'belirleyici'], m: ['nombre', 'sayı'] };
export const catLabel = (c) => CAT[c] || ['mot', 'kelime'];
const shown = (l) => l.replace(/^coeur$/, 'cœur').replace(/^soeur$/, 'sœur').replace(/oeu/g, 'œu').replace(/^oeil$/, 'œil');

// [{ lemma, cat, g, n, ph, tr }] for a word as written in a text (most frequent reading first).
export async function lookupWord(word) {
  const lex = await loadLexicon();
  const key = wordKey(word);
  const raw = lex.e[key] || lex.e[word.toLowerCase()] || [];
  const fw = lex.fw[word.toLowerCase().replace(/’/g, "'").replace(/'$/, 'e')] || lex.fw[key];
  const out = raw.map(([l, c, g, n, ph]) => ({ lemma: shown(l), cat: c, g, n, ph, tr: lex.tr[`${l}|${c}`] || null }));
  if (fw && !out.some((x) => x.tr)) {
    if (out.length) out[0].tr = fw; else out.push({ lemma: key, cat: 't', g: '', n: '', ph: null, tr: fw });
  }
  return out;
}
