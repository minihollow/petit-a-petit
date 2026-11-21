// Conjugation: tenses, persons, rows of a table (label, expected answer, colouring, pronunciation)
// and grading of an answer. Verb data comes from data/verbs.json (Lexique 3.83).
// No imports: also used by the Node scripts and tests.

export const TENSE_ORDER = ['ind:pre', 'pc', 'fp', 'ind:imp', 'imp:pre', 'ind:fut', 'cnd:pre', 'sub:pre'];

// fr / tr: name; eq: closest Turkish form; f: formula [fr, tr]; ex: example [fr, tr].
export const TENSES = {
  'ind:pre': { fr: 'Présent', tr: 'Şimdiki / geniş zaman', eq: '-iyor / -r',
    f: ['radical + terminaisons du présent', 'kök + présent ekleri'], ex: ['je parle', 'konuşuyorum / konuşurum'] },
  pc: { fr: 'Passé composé', tr: 'Geçmiş zaman', eq: '-di',
    f: ['avoir ou être au présent + participe passé', 'avoir ya da être (présent) + geçmiş zaman ortacı'], ex: ["j'ai parlé", 'konuştum'] },
  fp: { fr: 'Futur proche', tr: 'Yakın gelecek', eq: '-ecek (birazdan)',
    f: ['aller au présent + infinitif', 'aller (présent) + mastar'], ex: ['je vais parler', 'konuşacağım'] },
  'ind:imp': { fr: 'Imparfait', tr: 'Geçmişte süreklilik, alışkanlık', eq: '-iyordu / -rdı',
    f: ['radical de « nous » au présent + ais, ais, ait, ions, iez, aient', '«nous» kökü + ais, ais, ait, ions, iez, aient'], ex: ['je parlais', 'konuşuyordum / konuşurdum'] },
  'imp:pre': { fr: 'Impératif', tr: 'Emir kipi', eq: 'konuş! konuşalım! konuşun!',
    f: ['tu, nous, vous du présent, sans pronom (verbes en -er : pas de s avec tu)', 'présent\'in tu, nous, vous hâli, zamirsiz (-er fiillerinde tu için s düşer)'], ex: ['parle ! parlons ! parlez !', 'konuş! konuşalım! konuşun!'] },
  'ind:fut': { fr: 'Futur simple', tr: 'Gelecek zaman', eq: '-ecek',
    f: ['infinitif + ai, as, a, ons, ez, ont', 'mastar + ai, as, a, ons, ez, ont'], ex: ['je parlerai', 'konuşacağım'] },
  'cnd:pre': { fr: 'Conditionnel présent', tr: 'Şart, kibar rica', eq: '-rdı / -se',
    f: ['radical du futur + ais, ais, ait, ions, iez, aient', 'futur kökü + imparfait ekleri'], ex: ['je voudrais', 'isterdim'] },
  'sub:pre': { fr: 'Subjonctif présent', tr: 'İstek kipi', eq: '-meli / -sin',
    f: ['radical de « ils » au présent + e, es, e, ions, iez, ent', '«ils» kökü + e, es, e, ions, iez, ent'], ex: ['il faut que je parte', 'gitmem lazım'] },
};

export const SUBJ = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
export const SUBJ_LABEL = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
const IMP_REFL = [null, 'toi', null, 'nous', 'vous', null];
const NO_IMPERATIVE = new Set(['pouvoir', 'valoir', 'devoir', 'falloir', 'pleuvoir']);

const startsWithVowel = (w) => /^[aeiouyàâäéèêëîïôöûùüœæh]/i.test(w || '');
// "je" -> "j'" before a vowel or a mute h (le, me, te, se, que work the same way).
export const elide = (w, next) => (/^(je|me|te|se|que|ne|le)$/.test(w) && startsWithVowel(next) ? w.slice(0, -1) + "'" : w);
const join = (a, b) => (a.endsWith("'") ? a + b : `${a} ${b}`);

export const tenseApplies = (v, t) => !(t === 'imp:pre' && (NO_IMPERATIVE.has(v.inf) || v.only3s));
export const personApplies = (v, t, i) => (v.only3s ? i === 2 : t !== 'imp:pre' || [1, 3, 4].includes(i));

// Feminine / plural of a past participle (agreement with être).
function agree(pp, fem, plural) {
  let f = pp;
  if (fem) f += 'e';
  if (plural && !f.endsWith('s')) f += 's';
  return f;
}
const ppLabel = (pp, plural) => (plural ? `${pp}(e)${pp.endsWith('s') ? '' : 's'}` : `${pp}(e)`);

// ---------- colouring: radical / pronounced ending / silent letters ----------
const END = {
  'ind:pre': [['ai', 'e', 's', 'x'], ['es', 's', 'x'], ['e', 't', 'd', 'a', 'c'], ['ons', 'mes'], ['ez', 'tes'], ['ent', 'ont']],
  'ind:imp': [['ais'], ['ais'], ['ait'], ['ions'], ['iez'], ['aient']],
  'ind:fut': [['ai'], ['as'], ['a'], ['ons'], ['ez'], ['ont']],
  'cnd:pre': [['ais'], ['ais'], ['ait'], ['ions'], ['iez'], ['aient']],
  'sub:pre': [['e', 's'], ['es', 's'], ['e', 't'], ['ions', 'ons'], ['iez', 'ez'], ['ent']],
  'imp:pre': [[], ['e', 's', 'x', 'a'], [], ['ons'], ['ez', 'tes'], []],
};
const END2 = { // 2nd group (finir): fin|is, fin|issons, fin|issais…
  'ind:pre': [['is'], ['is'], ['it'], ['issons'], ['issez'], ['issent']],
  'ind:imp': [['issais'], ['issais'], ['issait'], ['issions'], ['issiez'], ['issaient']],
  'sub:pre': [['isse'], ['isses'], ['isse'], ['issions'], ['issiez'], ['issent']],
  'imp:pre': [[], ['is'], [], ['issons'], ['issez'], []],
};
const PP_END = ['é', 'i', 'u', 'û', 'is', 'it', 't', 's'];
const LETTER_SOUND = { d: 'd', t: 't', p: 'p', g: 'g', c: 'k', x: 'sz', s: 'sz', z: 'z' };

// Split an ending into pronounced / silent parts.
function markEnding(e, plural3) {
  if (!e) return [];
  if (plural3 && e.endsWith('ent')) return [[e.slice(0, -3), 'end'], ['ent', 'sil']];
  if (e === 'e' || e === 'es') return [[e, 'sil']];
  if (e.length > 2 && e.endsWith('es')) return [[e.slice(0, -2), 'end'], ['es', 'sil']];
  if (e.length > 1 && e.endsWith('e')) return [[e.slice(0, -1), 'end'], ['e', 'sil']];
  if (/[stxzd]$/.test(e)) return [[e.slice(0, -1), 'end'], [e.slice(-1), 'sil']];
  return [[e, 'end']];
}

// Segments [[text, kind]] for a simple form; kind: 'stem' | 'end' | 'sil'.
export function splitForm(form, tense, i, group, phon) {
  if (!form) return [];
  if (form === 'est') return [['e', 'end'], ['st', 'sil']];
  if (form === 'es' && tense === 'ind:pre') return [['e', 'end'], ['s', 'sil']];
  const sets = (group === 2 && END2[tense]) || END[tense];
  const cands = (sets?.[i] || []).filter((c) => form.endsWith(c) && (form.length > c.length || /^(ai|a|as|ont|es|est)$/.test(form)));
  const e = cands.sort((a, b) => b.length - a.length)[0] || '';
  let stem = form.slice(0, form.length - e.length);
  const parts = markEnding(e, i === 5 && tense !== 'ind:fut');
  // A final consonant of the radical can be silent too (prends = pren + ds, mets = me + ts).
  const pronouncedEnding = parts.some(([t, k]) => k === 'end' && t);
  const last = stem.slice(-1);
  if (!pronouncedEnding && LETTER_SOUND[last] && phon && !LETTER_SOUND[last].includes(phon.slice(-1))) {
    stem = stem.slice(0, -1);
    if (parts.length && parts[0][1] === 'sil') parts[0] = [last + parts[0][0], 'sil'];
    else parts.unshift([last, 'sil']);
  }
  return [[stem, 'stem'], ...parts].filter(([t]) => t);
}

export function splitParticiple(pp) {
  if (!pp) return [];
  if (pp.endsWith('ait')) return [[pp.slice(0, -1), 'stem'], ['t', 'sil']];
  const e = PP_END.filter((c) => pp.endsWith(c) && pp.length > c.length).sort((a, b) => b.length - a.length)[0] || '';
  const stem = pp.slice(0, pp.length - e.length);
  const parts = e === 'is' || e === 'it' ? [['i', 'end'], [e[1], 'sil']] : e === 't' || e === 's' ? [[e, 'sil']] : [[e, 'end']];
  return [[stem, 'stem'], ...parts].filter(([t]) => t);
}

// ---------- rows of a table ----------
// lookup(inf) returns another verb (être, avoir, aller) for compound tenses.
// Row: { i, label, answer, alts, parts, phon, say, stem, aux }
export function tableRows(v, tense, lookup) {
  if (!tenseApplies(v, tense)) return [];
  const rows = [];
  for (let i = 0; i < 6; i++) {
    if (!personApplies(v, tense, i)) continue;
    const row = buildRow(v, tense, i, lookup);
    if (row) rows.push(row);
  }
  return rows;
}

// Words before a form, each elided before the next one: ['que', 'il', 'se'] + 'asseye' -> "qu'il s'".
function phrase(words, next) {
  const all = [...words, next];
  return words.map((w, k) => elide(w, all[k + 1])).reduce((s, w) => (!s ? w : s.endsWith("'") ? s + w : `${s} ${w}`), '');
}

function buildRow(v, tense, i, lookup) {
  const subj = SUBJ[i];
  const plural = i >= 3;
  const refl = v.pron ? REFL[i] : null;
  if (tense === 'pc' || tense === 'fp') {
    const aux = lookup(tense === 'fp' ? 'aller' : v.aux)?.t['ind:pre'][i];
    if (!aux) return null;
    if (tense === 'fp') {
      // je vais parler / je vais m'asseoir
      const inf = refl ? join(phrase([refl], v.inf), v.inf) : v.inf;
      const answer = `${aux[0]} ${inf}`;
      const label = phrase([subj], aux[0]);
      const r = refl ? phrase([refl], v.inf) : '';
      return { i, label: labelOf(i, label), answer, alts: [], aux: aux[0],
        parts: [[aux[0], 'aux'], [' ', 'sp'], ...(r ? [[r.endsWith("'") ? r : `${r} `, 'refl']] : []), [v.inf, 'stem']],
        phon: [aux[1], v.inph].filter(Boolean).join(' '), say: join(label, answer) };
    }
    // passé composé: j'ai parlé, je suis allé(e), je me suis souvenu(e)
    const pp = v.pp?.[0];
    if (!pp) return null;
    const etre = v.aux === 'être';
    const label = phrase([subj, refl].filter(Boolean), aux[0]);
    const masc = etre ? agree(pp, false, plural) : pp;
    const alts = etre ? [agree(pp, true, plural)] : [];
    if (etre && i === 4) alts.push(agree(pp, false, false), agree(pp, true, false)); // vous: one person (polite)
    const shown = etre ? ppLabel(pp, plural) : pp;
    const base = shown.replace(/\(e\)s?$/, '');
    return { i, label: labelOf(i, label), answer: `${aux[0]} ${masc}`, alts: alts.map((a) => `${aux[0]} ${a}`), aux: aux[0], agree: etre,
      parts: [[aux[0], 'aux'], [' ', 'sp'], ...splitParticiple(base), ...(etre ? [[shown.slice(base.length), 'agr']] : [])],
      phon: [aux[1], v.pp[1]].filter(Boolean).join(' '), say: join(label, `${aux[0]} ${masc}`) };
  }
  const cell = v.t[tense]?.[i];
  if (!cell) return null;
  const [form, phon] = cell;
  if (tense === 'imp:pre') {
    const answer = refl ? `${form}-${IMP_REFL[i]}` : form;
    return { i, label: `(${subj})`, answer, alts: [], stem: stemOf(form, tense, i, v.group),
      parts: [...splitForm(form, tense, i, v.group, phon), ...(refl ? [[`-${IMP_REFL[i]}`, 'refl']] : [])], phon, say: answer };
  }
  const label = phrase([tense === 'sub:pre' ? 'que' : null, subj, refl].filter(Boolean), form);
  return { i, label: labelOf(i, label), answer: form, alts: [], stem: stemOf(form, tense, i, v.group),
    parts: splitForm(form, tense, i, v.group, phon), phon, say: join(label, form) };
}

// Label shown before the input: "j'", "il / elle", "que je"... (the spoken text keeps "il", "ils").
function labelOf(i, label) {
  if (i === 2) return label.replace(/(^|[ '])il(?=[ ']|$)/, '$1il / elle').replace("il / elle'", 'il / elle ');
  if (i === 5) return label.replace(/(^|[ '])ils(?=[ ']|$)/, '$1ils / elles').replace("ils / elles'", 'ils / elles ');
  return label;
}
const stemOf = (form, tense, i, group) => splitForm(form, tense, i, group, null).filter(([, k]) => k === 'stem').map(([t]) => t).join('');

// ---------- grading ----------
export const norm = (s) => String(s || '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
export const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');

// k: 'ok' | 'near' (accent or agreement only) | 'bad' | 'empty'; why: reason code for the message.
export function grade(input, row) {
  // The pronouns already shown before the input may be typed again: "je parle", "j'ai parlé", "me souviens".
  let a = norm(input);
  const shown = norm(row.label || '').replace(/[()]|\/ elles?/g, ' ').split(/[\s]+|(?<=')/).filter(Boolean);
  for (const w of [...shown, 'elle', 'elles', 'on']) {
    const re = new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${w.endsWith("'") ? '' : '\\s+'}`);
    if (re.test(a) && a.replace(re, '')) a = a.replace(re, '');
  }
  if (!a) return { k: 'empty' };
  const answers = [row.answer, ...(row.alts || [])].map(norm);
  if (answers.includes(a)) return { k: 'ok' };
  if (answers.some((x) => strip(x) === strip(a))) return { k: 'near', why: 'accent' };
  if (row.aux) {
    const [aux, ...rest] = a.split(' ');
    if (aux !== norm(row.aux)) return { k: 'bad', why: 'aux' };
    if (row.agree && strip(rest.join(' ')).replace(/e?s?$/, '') === strip(row.answer.split(' ').slice(1).join(' ')).replace(/e?s?$/, '')) return { k: 'near', why: 'agree' };
    return { k: 'bad', why: 'pp' };
  }
  if (row.stem && a.startsWith(norm(row.stem)) && a.length > row.stem.length - 1) return { k: 'bad', why: 'ending' };
  return { k: 'bad' };
}
