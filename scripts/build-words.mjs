// Builds the vocabulary data from Lexique 3.83 and the hand-written lists:
//   web/src/data/words.json   themes, words (gender, plural, feminine, pronunciation), gender statistics by ending
//   web/public/lexicon.json   every common form -> lemma, category, gender, pronunciation (+ Turkish when known),
//                             loaded on the first tap on a word
// Usage: node scripts/build-words.mjs <path/to/Lexique383.tsv>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tsv = process.argv[2] || join(here, '.cache', 'Lexique383.tsv');
const load = (f) => { const j = JSON.parse(readFileSync(join(here, f), 'utf8')); delete j._comment; return j; };
const themes = load('words-themes.json');
const verbsMeta = load('verbs-meta.json');
const functionWords = load('function-words.json');

// ---- Lexique ----
const lines = readFileSync(tsv, 'utf8').split('\n');
const head = lines[0].split('\t');
const C = Object.fromEntries(['ortho', 'phon', 'lemme', 'cgram', 'genre', 'nombre', 'freqlemfilms2', 'freqlemlivres', 'freqfilms2', 'freqlivres'].map((k) => [k, head.indexOf(k)]));
const byOrtho = new Map();
const byLemma = new Map();
const lemmaFreq = new Map();
for (let i = 1; i < lines.length; i++) {
  const r = lines[i].split('\t');
  if (r.length < 10) continue;
  const row = { o: r[C.ortho], ph: r[C.phon], l: r[C.lemme], c: r[C.cgram], g: r[C.genre], n: r[C.nombre],
    flf: +r[C.freqlemfilms2] || 0, fll: +r[C.freqlemlivres] || 0, f: (+r[C.freqfilms2] || 0) + (+r[C.freqlivres] || 0) };
  if (!byOrtho.has(row.o)) byOrtho.set(row.o, []);
  byOrtho.get(row.o).push(row);
  if (!byLemma.has(row.l)) byLemma.set(row.l, []);
  byLemma.get(row.l).push(row);
  const k = `${row.l}|${row.c}`;
  lemmaFreq.set(k, Math.max(lemmaFreq.get(k) || 0, row.flf + row.fll / 2));
}
const best = (rows) => [...rows].sort((a, b) => b.f - a.f)[0];
const variants = (w) => [...new Set([w, w.toLowerCase(), w.replace(/œ/g, "oe"), w.toLowerCase().replace(/œ/g, "oe"), w.replace(/-/g, " "), w.replace(/-/g, "")])];
const lookup = (map, w) => { for (const v of variants(w)) if (map.get(v)) return map.get(v); return null; };
// Proper nouns are not in Lexique.
const PHON_EXTRA = { France: "fR@s", Turquie: "tyRki", Allemagne: "alm@N", Angleterre: "@gl°tER", Espagne: "EspaN", Italie: "itali", Maroc: "maROk", Portugal: "pORtygal", "États-Unis": "etazyni", "après-midi": "apREmidi" };
// Lexique writes oe for œ: shown words get their ligature back.
const OE = { coeur: "cœur", soeur: "sœur", oeil: "œil", oeuf: "œuf", oeuvre: "œuvre", voeu: "vœu", noeud: "nœud", boeuf: "bœuf", moeurs: "mœurs", manoeuvre: "manœuvre", oeillet: "œillet" };
const shown = (w) => OE[w] || w;
const VULGAR = new Set(["putain", "catin", "salope", "connard", "con", "conne", "bite", "pute", "merde", "cul", "enculé", "salaud", "bordel", "chiotte", "nichon", "couille"]);
const report = [];

// ---- themes -> words ----
const CAT = { m: 'NOM', f: 'NOM', mf: 'NOM', mpl: 'NOM', fpl: 'NOM', adj: 'ADJ', adv: 'ADV', pre: 'PRE', con: 'CON' };
const phonOfToken = (t) => {
  const rows = lookup(byOrtho, t) || [];
  return rows.length ? best(rows).ph : null;
};
// Pronunciation of a several-word entry: words joined, elided ones (d', l') glued to the next.
function phrasePhon(s) {
  const parts = s.toLowerCase().match(/[a-zàâäçéèêëîïôöûùüœæ-]+'?/g) || [];
  const out = [];
  for (const p of parts) {
    const ph = phonOfToken(p) ?? phonOfToken(p.replace(/'$/, 'e'));
    if (!ph) return null;
    if (p.endsWith("'")) out.push(ph.replace(/°$/, '') + '\u0000'); else out.push(ph);
  }
  return out.join(' ').replace(/\u0000 /g, '');
}

const words = {};
const themeList = [];
for (const [id, t] of Object.entries(themes)) {
  const ids = [];
  for (const [fr, tr, type, note] of t.words) {
    ids.push(fr);
    if (words[fr]) continue;
    const w = { fr, tr, t: type };
    if (note) w.note = note;
    const multi = /[ ']/.test(fr) && type !== 'adv' && type !== 'con' ? true : /[ ]/.test(fr);
    const cat = CAT[type];
    const key = fr.toLowerCase();
    const rows = (lookup(byOrtho, fr) || []).filter((r) => !cat || r.c === cat);
    if (multi) {
      w.ph = phrasePhon(fr);
      if (!w.ph) report.push(`${fr}: prononciation introuvable`);
    } else {
      const any = lookup(byOrtho, fr) || [];
      if (!any.length && !PHON_EXTRA[fr]) { report.push(`${fr}: absent de Lexique`); }
      w.ph = (rows.length ? best(rows) : any.length ? best(any) : null)?.ph || PHON_EXTRA[fr] || null;
      w.fq = Math.round(Math.max(...(rows.length ? rows : any).map((r) => r.flf), 0) * 10) / 10;
    }
    if (cat === 'NOM' && !multi) {
      const gs = new Set(rows.map((r) => r.g).filter(Boolean));
      const want = type[0];
      if (type !== 'mf' && gs.size && !gs.has(want)) report.push(`${fr}: genre ${type} mais Lexique dit ${[...gs].join('/')}`);
      if (!type.endsWith('pl')) {
        const pl = (lookup(byLemma, fr) || []).filter((r) => r.c === 'NOM' && r.n === 'p');
        const p = pl.length ? best(pl) : null;
        const regular = /[sxz]$/.test(fr) ? fr : `${fr}s`;
        if (p && shown(p.o) !== regular && shown(p.o) !== fr && p.o !== fr.replace(/œ/g, 'oe') + 's') { w.pl = shown(p.o); w.plPh = p.ph; }
      }
    }
    if (cat === 'ADJ' && !multi) {
      const fem = (lookup(byLemma, fr) || []).filter((r) => r.c === 'ADJ' && r.g === 'f' && r.n === 's');
      const f = fem.length ? best(fem) : null;
      if (f && f.o !== fr) { w.fem = f.o; w.femPh = f.ph; }
    }
    words[fr] = w;
  }
  themeList.push({ id, fr: t.fr, tr: t.tr, words: ids });
}

// ---- gender by ending, over common nouns ----
const ENDINGS = ['tion', 'sion', 'age', 'ment', 'eau', 'té', 'ette', 'ure', 'isme', 'oir', 'ance', 'ence', 'ie', 'ade', 'ine', 'elle', 'esse',
  'ude', 'ise', 'ée', 'ier', 'et', 'on', 'ail', 'eil', 'ème', 'ique', 'eur', 'euse', 'trice', 'teur', 'ière', 'o', 'ou', 'at', 'in', 'ain', 'ard', 'ole', 'ule', 'oire', 'ité', 'gie', 'phie', 'logue', 'aire', 'ette'];
const nounsSeen = new Map();
for (const [o, rows] of byOrtho) {
  for (const r of rows) {
    if (r.c !== 'NOM' || r.l !== o || (r.n && r.n !== 's') || !/^[mf]$/.test(r.g) || r.flf < 1 || /[A-Z\s'-]/.test(o) || VULGAR.has(o)) continue;
    const prev = nounsSeen.get(o);
    if (prev && prev.g !== r.g) nounsSeen.set(o, { ...prev, both: true });
    else if (!prev) nounsSeen.set(o, { o: shown(o), g: r.g, fq: r.flf });
  }
}
const stats = new Map();
for (const w of nounsSeen.values()) {
  if (w.both) continue;
  const e = ENDINGS.filter((x) => w.o.endsWith(x) && w.o.length > x.length).sort((a, b) => b.length - a.length)[0];
  if (!e) continue;
  if (!stats.has(e)) stats.set(e, []);
  stats.get(e).push(w);
}
const genderRules = [];
for (const [e, list] of stats) {
  if (list.length < 15) continue;
  const f = list.filter((w) => w.g === 'f');
  const m = list.filter((w) => w.g === 'm');
  const major = f.length >= m.length ? 'f' : 'm';
  const share = Math.max(f.length, m.length) / list.length;
  if (share < 0.75) continue;
  const byFq = (a, b) => b.fq - a.fq;
  genderRules.push({ e, g: major, pct: Math.round(share * 1000) / 10, n: list.length,
    ex: (major === 'f' ? f : m).sort(byFq).slice(0, 4).map((w) => w.o), exc: (major === 'f' ? m : f).sort(byFq).slice(0, 4).map((w) => w.o) });
}
genderRules.sort((a, b) => b.pct - a.pct || b.n - a.n);

writeFileSync(join(here, '..', 'web', 'src', 'data', 'words.json'), JSON.stringify({
  source: 'Genre, pluriels, féminins, prononciation et fréquences : Lexique 3.83 (www.lexique.org), CC BY-SA 4.0. Listes par thème et sens en turc : projet Petit à petit, CC BY-SA 4.0.',
  themes: themeList, words, genderRules,
}) + '\n');

// ---- lexicon for the word bubble ----
const CATS = { NOM: 'n', ADJ: 'a', VER: 'v', AUX: 'v', ADV: 'd', PRE: 'p', CON: 'c', 'ART:def': 't', 'ART:ind': 't', 'ADJ:pos': 't', 'ADJ:dem': 't', 'ADJ:int': 't', 'ADJ:ind': 't', 'ADJ:num': 'm',
  'PRO:per': 'r', 'PRO:pos': 'r', 'PRO:dem': 'r', 'PRO:ind': 'r', 'PRO:int': 'r', 'PRO:rel': 'r' };
const glossLemma = {};
for (const w of Object.values(words)) if (!/[ ]/.test(w.fr)) glossLemma[`${w.fr.toLowerCase()}|${w.t === 'adj' ? 'a' : w.t === 'adv' ? 'd' : w.t === 'pre' ? 'p' : w.t === 'con' ? 'c' : 'n'}`] = w.tr;
for (const [inf, m] of Object.entries(verbsMeta)) glossLemma[`${inf}|v`] = m.tr;
const keep = (r) => CATS[r.c] && !VULGAR.has(r.l) && ((r.flf >= 12 && r.f >= 0.3) || glossLemma[`${r.l}|${CATS[r.c]}`]);
const entries = {};
for (const [o, rows] of byOrtho) {
  const key = o.toLowerCase();
  if (/[\s]/.test(key)) continue;
  for (const r of rows) {
    if (!keep(r)) continue;
    const c = CATS[r.c];
    const list = (entries[key] ||= []);
    if (list.some((x) => x[0] === r.l && x[1] === c)) continue;
    list.push([r.l, c, r.g || '', r.n || '', r.ph, Math.round(r.f)]);
  }
}
for (const list of Object.values(entries)) list.sort((a, b) => b[5] - a[5]);
const tr = {};
for (const list of Object.values(entries)) for (const [l, c] of list) { const g = glossLemma[`${l}|${c}`]; if (g) tr[`${l}|${c}`] = g; }
for (const list of Object.values(entries)) for (const e of list) e.pop(); // frequency was only for the order
const lexicon = { v: 1, e: entries, tr, fw: functionWords };
const lexFile = join(here, '..', 'web', 'public', 'lexicon.json');
writeFileSync(lexFile, JSON.stringify(lexicon));

console.log(`${themeList.length} thèmes, ${Object.keys(words).length} mots, ${genderRules.length} règles de genre`);
console.log(`lexique : ${Object.keys(entries).length} formes, ${Object.keys(tr).length} sens turcs, ${Math.round(JSON.stringify(lexicon).length / 1024)} Ko`);
for (const l of report) console.log('  ! ' + l);
