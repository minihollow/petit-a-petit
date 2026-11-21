// Pronunciation: Lexique 3 phonological notation -> IPA, and -> "Turkish letters"
// (French sounds written with the Turkish alphabet: u = ü, ou = u, eu = ö, ch = ş…).
// ⁿ after a vowel: nasal vowel (say it through the nose, without a full n).
// No imports: also used by the Node scripts.

const IPA = {
  a: 'a', e: 'e', E: 'ɛ', i: 'i', o: 'o', O: 'ɔ', u: 'u', y: 'y', 2: 'ø', 9: 'œ', '°': 'ə',
  '@': 'ɑ̃', 5: 'ɛ̃', '§': 'ɔ̃', 1: 'œ̃', j: 'j', w: 'w', 8: 'ɥ',
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'ɡ', f: 'f', v: 'v', s: 's', z: 'z', S: 'ʃ', Z: 'ʒ',
  m: 'm', n: 'n', N: 'ɲ', G: 'ŋ', l: 'l', R: 'ʁ', x: 'x',
};
const TK = {
  a: 'a', e: 'e', E: 'e', i: 'i', o: 'o', O: 'o', u: 'u', y: 'ü', 2: 'ö', 9: 'ö', '°': 'ö',
  '@': 'aⁿ', 5: 'eⁿ', '§': 'oⁿ', 1: 'eⁿ', j: 'y', w: 'u', 8: 'ü',
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g', f: 'f', v: 'v', s: 's', z: 'z', S: 'ş', Z: 'j',
  m: 'm', n: 'n', N: 'ny', G: 'ng', l: 'l', R: 'r', x: 'h',
};

const map = (table) => (p) => (p ? [...String(p)].map((c) => table[c] ?? c).join('') : '');
export const toIPA = map(IPA);
const tk = map(TK);
export const toTK = (p) => (p ? tk(String(p).replace(/jj/g, 'j')) : '');
