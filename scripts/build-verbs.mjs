// Builds web/src/data/verbs.json from Lexique 3.83 and scripts/verbs-meta.json.
// Usage: node scripts/build-verbs.mjs <path/to/Lexique383.tsv>
// Lexique 3.83 (http://www.lexique.org, CC BY-SA 4.0): download Lexique383.zip, extract Lexique383.tsv.
// For each verb of verbs-meta.json: the simple tenses (forms + Lexique phonology), the past participle,
// group, auxiliary. Cells missing from Lexique are derived by rule; what stays missing is reported.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tsv = process.argv[2] || join(here, '.cache', 'Lexique383.tsv');
const meta = JSON.parse(readFileSync(join(here, 'verbs-meta.json'), 'utf8'));
delete meta._comment;
const wanted = new Set(Object.keys(meta));

const TENSES = ['ind:pre', 'ind:imp', 'ind:fut', 'cnd:pre', 'sub:pre', 'imp:pre'];
const PERS = ['1s', '2s', '3s', '1p', '2p', '3p'];

// ---- read Lexique (only the verb rows we need) ----
const rows = readFileSync(tsv, 'utf8').split('\n');
const head = rows[0].split('\t');
const col = (n) => head.indexOf(n);
const C = { ortho: col('ortho'), phon: col('phon'), lemme: col('lemme'), cgram: col('cgram'), genre: col('genre'), nombre: col('nombre'),
  flf: col('freqlemfilms2'), fll: col('freqlemlivres'), ff: col('freqfilms2'), fl: col('freqlivres'), info: col('infover') };
const byLemma = new Map(); // lemma -> rows
const anyVerbPhon = new Map(); // ortho -> phon (any verb row), for derived forms
for (let i = 1; i < rows.length; i++) {
  const r = rows[i].split('\t');
  if (r.length < 11) continue;
  const cg = r[C.cgram];
  if (cg !== 'VER' && cg !== 'AUX') continue;
  const o = r[C.ortho];
  if (!anyVerbPhon.has(o)) anyVerbPhon.set(o, r[C.phon]);
  if (!wanted.has(r[C.lemme])) continue;
  if (o.includes("'") || (o.length < 2 && o !== 'a')) continue; // Lexique artifacts (n', s)
  if (!byLemma.has(r[C.lemme])) byLemma.set(r[C.lemme], []);
  byLemma.get(r[C.lemme]).push({ o, phon: r[C.phon], g: r[C.genre], n: r[C.nombre], freq: (+r[C.ff] || 0) + (+r[C.fl] || 0),
    flf: +r[C.flf] || 0, fll: +r[C.fll] || 0, tags: r[C.info].split(';').filter(Boolean), cg });
}

// ---- irregular cells Lexique tags incompletely (forms are standard French) ----
const OVERRIDE = {
  'être': { 'sub:pre': ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'], 'imp:pre': [null, 'sois', null, 'soyons', 'soyez', null] },
  avoir: { 'sub:pre': ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'], 'imp:pre': [null, 'aie', null, 'ayons', 'ayez', null] },
  faire: { 'sub:pre': ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent'] },
  pouvoir: { 'sub:pre': ['puisse', 'puisses', 'puisse', 'puissions', 'puissiez', 'puissent'], 'imp:pre': [null, null, null, null, null, null] },
  savoir: { 'sub:pre': ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent'], 'imp:pre': [null, 'sache', null, 'sachons', 'sachez', null] },
  vouloir: { 'sub:pre': ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent'], 'imp:pre': [null, 'veuille', null, 'veuillons', 'veuillez', null] },
  aller: { 'sub:pre': ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent'], 'imp:pre': [null, 'va', null, 'allons', 'allez', null] },
  valoir: { 'sub:pre': ['vaille', 'vailles', 'vaille', 'valions', 'valiez', 'vaillent'], 'imp:pre': [null, null, null, null, null, null] },
  devoir: { 'imp:pre': [null, null, null, null, null, null] },
  falloir: { 'imp:pre': [null, null, null, null, null, null], 'sub:pre': [null, null, 'faille', null, null, null] },
  pleuvoir: { 'imp:pre': [null, null, null, null, null, null] },
  suivre: { 'ind:pre': ['suis', 'suis', 'suit', 'suivons', 'suivez', 'suivent'] },
};
// Verbs with two accepted conjugations: one consistent series (Lexique mixes them cell by cell).
Object.assign(OVERRIDE, {
  asseoir: {
    'ind:pre': ['assieds', 'assieds', 'assied', 'asseyons', 'asseyez', 'asseyent'],
    'ind:imp': ['asseyais', 'asseyais', 'asseyait', 'asseyions', 'asseyiez', 'asseyaient'],
    'ind:fut': ['assiérai', 'assiéras', 'assiéra', 'assiérons', 'assiérez', 'assiéront'],
    'cnd:pre': ['assiérais', 'assiérais', 'assiérait', 'assiérions', 'assiériez', 'assiéraient'],
    'sub:pre': ['asseye', 'asseyes', 'asseye', 'asseyions', 'asseyiez', 'asseyent'],
    'imp:pre': [null, 'assieds', null, 'asseyons', 'asseyez', null],
  },
  payer: {
    'ind:pre': ['paie', 'paies', 'paie', 'payons', 'payez', 'paient'],
    'ind:fut': ['paierai', 'paieras', 'paiera', 'paierons', 'paierez', 'paieront'],
    'cnd:pre': ['paierais', 'paierais', 'paierait', 'paierions', 'paieriez', 'paieraient'],
    'sub:pre': ['paie', 'paies', 'paie', 'payions', 'payiez', 'paient'],
    'imp:pre': [null, 'paie', null, 'payons', 'payez', null],
  },
  essayer: {
    'ind:pre': ['essaie', 'essaies', 'essaie', 'essayons', 'essayez', 'essaient'],
    'ind:fut': ['essaierai', 'essaieras', 'essaiera', 'essaierons', 'essaierez', 'essaieront'],
    'cnd:pre': ['essaierais', 'essaierais', 'essaierait', 'essaierions', 'essaieriez', 'essaieraient'],
    'sub:pre': ['essaie', 'essaies', 'essaie', 'essayions', 'essayiez', 'essaient'],
    'imp:pre': [null, 'essaie', null, 'essayons', 'essayez', null],
  },
});
const PP_OVERRIDE = { plaire: ['plu', 'ply'] };
// Ending each tag implies (person order 1s 2s 3s 1p 2p 3p).
const VALID = {
  'ind:pre': [/(e|s|x|ai)$/, /(es|s|x)$/, /(e|t|d|a|c)$/, /(ons|mes)$/, /(ez|tes)$/, /(ent|ont)$/],
  'ind:imp': [/ais$/, /ais$/, /ait$/, /ions$/, /iez$/, /aient$/],
  'ind:fut': [/ai$/, /as$/, /a$/, /ons$/, /ez$/, /ont$/],
  'cnd:pre': [/ais$/, /ais$/, /ait$/, /ions$/, /iez$/, /aient$/],
  'sub:pre': [/(e|s)$/, /(es|s)$/, /(e|t)$/, /ons$/, /ez$/, /ent$/],
  'imp:pre': [null, /(e|s|x|a)$/, null, /ons$/, /(ez|tes)$/, null],
};
// Phonology for override forms Lexique may lack.
const PHON_EXTRA = { soyons: 'swaj§', soyez: 'swaje', sois: 'swa', soit: 'swa', soient: 'swa', ayons: 'Ej§', ayez: 'Eje',
  fassions: 'fasj§', fassiez: 'fasje', puissions: 'p8isj§', puissiez: 'p8isje', sachions: 'saSj§', sachiez: 'saSje',
  allions: 'alj§', alliez: 'alje', valions: 'valj§', valiez: 'valje', voulions: 'vulj§', vouliez: 'vulje', veuillons: 'v9j§', veuillez: 'v9je',
  vailles: 'vaj', faille: 'faj', suis: 's8i',
  asseyent: 'asEj', asseye: 'asEj', asseyes: 'asEj', asseyions: 'asEj§', asseyiez: 'asEje', assiéras: 'asjeRa', assiéront: 'asjeR§',
  assiéraient: 'asjeRE', assiérez: 'asjeRe', assiérons: 'asjeR§', assiériez: 'asjeRje', assiérions: 'asjeRj§',
  paieriez: 'pERje', paierions: 'pERj§', payiez: 'peje', payions: 'pej§', essaieriez: 'esERje', essaierions: 'esERj§',
  essayiez: 'eseje', essayions: 'esej§' };
// Pronunciation of tense endings (Lexique notation), used to give derived forms a pronunciation by analogy.
const END_PHON = {
  'ind:imp': [['aient', 'E'], ['ais', 'E'], ['ait', 'E'], ['ions', 'j§'], ['iez', 'je']],
  'cnd:pre': [['aient', 'E'], ['ais', 'E'], ['ait', 'E'], ['ions', 'j§'], ['iez', 'je']],
  'ind:fut': [['ai', 'E'], ['as', 'a'], ['a', 'a'], ['ons', '§'], ['ez', 'e'], ['ont', '§']],
  'sub:pre': [['ions', 'j§'], ['iez', 'je'], ['ent', ''], ['es', ''], ['e', '']],
};
const endOf = (t, f) => (END_PHON[t] || []).find(([e]) => f.endsWith(e)) || null;

const report = [];
const out = [];
for (const inf of Object.keys(meta)) {
  const m = meta[inf];
  const rs = byLemma.get(inf);
  if (!rs) { report.push(`${inf}: absent de Lexique`); continue; }
  const phonOf = new Map();
  for (const r of [...rs].sort((a, b) => b.freq - a.freq)) if (!phonOf.has(r.o)) phonOf.set(r.o, r.phon);
  // tag -> candidate rows, most frequent spelling first; a candidate must have the ending its tag implies
  // (Lexique has a few wrong tags, e.g. «acheter» tagged ind:pre:2p).
  const cands = new Map();
  for (const r of rs) for (const t of r.tags) { if (!cands.has(t)) cands.set(t, []); cands.get(t).push(r); }
  for (const list of cands.values()) list.sort((a, b) => b.freq - a.freq || (a.cg === 'VER' ? -1 : 1));
  const pick = (tag) => {
    const [tn, tm, p] = tag.split(':');
    const re = VALID[`${tn}:${tm}`]?.[PERS.indexOf(p)];
    const ok = (cands.get(tag) || []).find((r) => !re || re.test(r.o));
    return ok?.o || null;
  };
  const T = {};
  for (const t of TENSES) T[t] = PERS.map((p) => pick(`${t}:${p}`));
  T['imp:pre'] = [null, pick('imp:pre:2s'), null, pick('imp:pre:1p'), pick('imp:pre:2p'), null];

  // ---- derivations for cells Lexique did not tag ----
  const derived = [];
  const fill = (t, i, v) => { if (!T[t][i] && v) { T[t][i] = v; derived.push(`${t}:${PERS[i]}`); } };
  const stemFrom = (t, ends) => { for (let i = 0; i < 6; i++) { const f = T[t][i]; if (f && f.endsWith(ends[i])) return f.slice(0, f.length - ends[i].length); } return null; };
  const IMP_END = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'];
  const FUT_END = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];
  const SUB_END = ['e', 'es', 'e', 'ions', 'iez', 'ent'];
  if (!m.only3s) {
    const si = stemFrom('ind:imp', IMP_END); if (si) IMP_END.forEach((e, i) => fill('ind:imp', i, si + e));
    const sf = stemFrom('ind:fut', FUT_END) || stemFrom('cnd:pre', IMP_END);
    if (sf) { FUT_END.forEach((e, i) => fill('ind:fut', i, sf + e)); IMP_END.forEach((e, i) => fill('cnd:pre', i, sf + e)); }
    if (!OVERRIDE[inf]?.['sub:pre']) {
      fill('sub:pre', 3, T['ind:imp'][3]); fill('sub:pre', 4, T['ind:imp'][4]);
      fill('sub:pre', 5, T['ind:pre'][5]);
      const ss = T['sub:pre'][5]?.endsWith('ent') ? T['sub:pre'][5].slice(0, -3) : null;
      if (ss) [0, 1, 2].forEach((i) => fill('sub:pre', i, ss + SUB_END[i]));
    }
    if (!OVERRIDE[inf]?.['imp:pre']) {
      const p2 = T['ind:pre'][1];
      fill('imp:pre', 1, p2 && (p2.endsWith('es') ? p2.slice(0, -1) : p2));
      fill('imp:pre', 3, T['ind:pre'][3]); fill('imp:pre', 4, T['ind:pre'][4]);
    }
  }
  for (const [t, forms] of Object.entries(OVERRIDE[inf] || {})) T[t] = forms.slice();
  if (m.only3s) for (const t of TENSES) T[t] = T[t].map((f, i) => (i === 2 ? f : null));
  for (const t of TENSES) T[t].forEach((f, i) => { const re = VALID[t][i]; if (f && re && !re.test(f)) report.push(`${inf}: ${t}:${PERS[i]} suspect «${f}»`); });

  // ---- forms -> [form, phon] ----
  const known = (f) => phonOf.get(f) || PHON_EXTRA[f] || anyVerbPhon.get(f) || null;
  const infPhon = known(inf);
  // Pronunciation of a form Lexique lacks: stem pronunciation of a sibling form of the same tense
  // (or of the future/conditional, which share their stem), plus the pronunciation of the ending.
  const analog = (t, f) => {
    const ef = endOf(t, f);
    if (!ef) return null;
    const stemF = f.slice(0, f.length - ef[0].length);
    const sibs = t === 'ind:fut' || t === 'cnd:pre' ? [...T['ind:fut'], ...T['cnd:pre']] : T[t];
    for (const g of sibs) {
      if (!g || g === f) continue;
      const tg = T['ind:fut'].includes(g) ? 'ind:fut' : T['cnd:pre'].includes(g) ? 'cnd:pre' : t;
      const eg = endOf(tg, g); const pg = known(g);
      if (!eg || !pg || g.slice(0, g.length - eg[0].length) !== stemF || !pg.endsWith(eg[1])) continue;
      return (pg.slice(0, pg.length - eg[1].length) + ef[1]).replace(/jj/g, 'j');
    }
    if ((t === 'ind:fut' || t === 'cnd:pre') && stemF === (group === 1 ? null : inf.replace(/e$/, '')) && infPhon) return infPhon + ef[1];
    if ((t === 'ind:fut' || t === 'cnd:pre') && inf.endsWith('er') && stemF.endsWith('er')) {
      const p1 = known(T['ind:pre'][0] || '');
      if (p1) return p1 + '°R' + ef[1];
    }
    if (t === 'ind:imp' || t === 'sub:pre') {
      const p = known(T['ind:pre'][3] || '');
      if (p && p.endsWith('§') && (T['ind:pre'][3] || '').slice(0, -3) === stemF) return (p.slice(0, -1) + ef[1]).replace(/jj/g, 'j');
    }
    return null;
  };
  const missing = [];
  const cellOf = (t) => (f) => { if (!f) return null; const ph = known(f) || analog(t, f); if (!ph) missing.push(f); return ph ? [f, ph] : [f]; };
  const pres1pForGroup = T['ind:pre'][3] || '';
  const group = inf.endsWith('er') && inf !== 'aller' ? 1 : inf.endsWith('ir') && pres1pForGroup.endsWith('issons') ? 2 : 3;
  const tenses = {};
  for (const t of TENSES) tenses[t] = T[t].map(cellOf(t));
  for (const t of TENSES) T[t].forEach((f, i) => {
    const expected = !m.only3s || i === 2;
    const impOnly = t === 'imp:pre' && ![1, 3, 4].includes(i);
    const noImp = t === 'imp:pre' && ['pouvoir', 'valoir', 'devoir', 'falloir', 'pleuvoir'].includes(inf);
    if (!f && expected && !impOnly && !noImp) report.push(`${inf}: ${t}:${PERS[i]} manquant`);
  });

  // ---- past participle (masculine singular) ----
  const pps = rs.filter((r) => r.tags.includes('par:pas'));
  const ms = pps.find((r) => r.g === 'm' && r.n === 's') || pps.sort((a, b) => a.o.length - b.o.length || b.freq - a.freq)[0];
  const pp = PP_OVERRIDE[inf] || (ms ? [ms.o, ms.phon] : null);
  if (!pp) report.push(`${inf}: participe passé manquant`);
  const freq = Math.round(Math.max(...rs.map((r) => r.flf)) * 10) / 10;

  const v = { inf, tr: m.tr, group, aux: m.aux || (m.pron ? 'être' : 'avoir'), freq, inph: infPhon, pp, t: tenses };
  if (m.pron) v.pron = true;
  if (m.only3s) v.only3s = true;
  if (m.note) v.note = m.note;
  out.push(v);
  if (derived.length) report.push(`${inf}: dérivé ${derived.join(', ')}`);
  if (missing.length) report.push(`${inf}: phonologie absente pour ${missing.join(', ')}`);
}
out.sort((a, b) => b.freq - a.freq);

const file = join(here, '..', 'web', 'src', 'data', 'verbs.json');
writeFileSync(file, JSON.stringify({
  source: 'Formes et phonologie : Lexique 3.83 (New, Pallier et al., www.lexique.org), CC BY-SA 4.0. Sens en turc : projet Petit à petit, CC BY-SA 4.0.',
  verbs: out,
}) + '\n');
console.log(`${out.length} verbes -> ${file}`);
const serious = report.filter((l) => !l.includes('dérivé'));
console.log(`${report.length - serious.length} verbes avec cellules dérivées par règle`);
for (const l of serious) console.log('  ! ' + l);
