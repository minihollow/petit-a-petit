// Vocabulary: themes, words (data/words.json), articles, gender rules, answers and grading of a word card.
// A word card ("word:chien") asks for the French word from its Turkish meaning, with its article.
import DATA from '../data/words.json';
import { norm, strip } from './conj.js';

export const THEMES = DATA.themes;
export const WORDS = DATA.words;
export const GENDER_RULES = DATA.genderRules;
export const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export const wordCardId = (fr) => `word:${fr}`;
export const parseWordCard = (id) => (id?.startsWith('word:') ? WORDS[id.slice(5)] || null : null);

export const isNoun = (w) => ['m', 'f', 'mf', 'mpl', 'fpl'].includes(w.t);
export const isPlural = (w) => w.t === 'mpl' || w.t === 'fpl';
export const genderOf = (w) => (isNoun(w) ? w.t[0] === 'm' && w.t !== 'mf' ? 'm' : w.t === 'mf' ? 'mf' : 'f' : null);
const PROPER = (w) => /^[A-ZÉ]/.test(w.fr);
// h aspiré: no elision (la honte, le haricot).
const H_ASPIRE = new Set(['honte', 'haricot', 'hasard', 'héros', 'hibou', 'hall', 'hache', 'haine', 'handicap', 'hockey', 'hamster', 'hamburger', 'hausse', 'hauteur', 'haut']);
export const elides = (w) => /^[aeiouyàâäéèêëîïôöûùüœæ]/i.test(w.fr) || (/^h/i.test(w.fr) && !H_ASPIRE.has(w.fr.toLowerCase()));

export function defArticle(w) {
  if (!isNoun(w)) return '';
  if (isPlural(w)) return 'les ';
  if (elides(w)) return "l'";
  return w.t === 'mf' ? 'le / la ' : w.t === 'm' ? 'le ' : 'la ';
}
export function indefArticle(w) {
  if (!isNoun(w) || PROPER(w)) return '';
  if (isPlural(w)) return 'des ';
  return w.t === 'mf' ? 'un / une ' : w.t === 'm' ? 'un ' : 'une ';
}
// How the word is shown in lists: "le chien", "l'arbre", "les gens", "grand / grande".
export function label(w) {
  if (isNoun(w)) return defArticle(w) + w.fr;
  if (w.t === 'adj' && w.fem) return `${w.fr} / ${w.fem}`;
  return w.fr;
}
// The answer expected in a card: the article shows the gender, so l' becomes un / une.
export function answerOf(w) {
  if (!isNoun(w)) return w.fr;
  if (PROPER(w)) return defArticle(w) + w.fr;
  if (elides(w) && !isPlural(w)) return indefArticle(w).replace(' / ', ' / ') + w.fr;
  return defArticle(w) + w.fr;
}

const POS_LABEL = {
  m: ['nom masculin', 'eril isim'], f: ['nom féminin', 'dişil isim'], mf: ['nom (masc. ou fém.)', 'isim (eril ya da dişil)'],
  mpl: ['nom masculin pluriel', 'eril çoğul isim'], fpl: ['nom féminin pluriel', 'dişil çoğul isim'], adj: ['adjectif', 'sıfat'], adv: ['adverbe', 'zarf'],
  pre: ['préposition', 'edat'], con: ['conjonction', 'bağlaç'], int: ['mot interrogatif', 'soru kelimesi'], expr: ['expression', 'kalıp ifade'],
};
export const posLabel = (w) => POS_LABEL[w.t] || ['mot', 'kelime'];

// Gender rule matching a noun's ending, and whether the noun follows it.
export function ruleFor(w) {
  if (!isNoun(w) || w.t === 'mf' || isPlural(w)) return null;
  const word = w.fr.toLowerCase();
  const rule = GENDER_RULES.filter((r) => word.endsWith(r.e) && word.length > r.e.length).sort((a, b) => b.e.length - a.e.length)[0];
  if (!rule) return null;
  return { ...rule, follows: rule.g === genderOf(w) };
}

// ---------- grading ----------
const ARTS = ['le', 'la', "l'", 'les', 'un', 'une', 'des'];
function splitArticle(s) {
  const m = /^(le|la|les|un|une|des)\s+(.+)$/.exec(s) || /^(l')\s*(.+)$/.exec(s);
  return m ? { art: m[1], rest: m[2] } : { art: '', rest: s };
}
// { k: 'ok' | 'near' | 'bad', why }
export function gradeWord(input, w) {
  const a = norm(input).replace(/\s*\/\s*/g, ' / ');
  if (!a) return { k: 'bad', why: 'empty' };
  const target = norm(w.fr);
  if (!isNoun(w)) {
    const ok = [target, w.fem && norm(w.fem)].filter(Boolean);
    if (ok.includes(a)) return { k: 'ok' };
    if (ok.some((x) => strip(x) === strip(a))) return { k: 'near', why: 'accent' };
    return { k: 'bad' };
  }
  const { art, rest } = splitArticle(a);
  const sameWord = rest === target || (w.pl && rest === norm(w.pl));
  const almostWord = !sameWord && strip(rest) === strip(target);
  if (!sameWord && !almostWord) return { k: 'bad' };
  if (PROPER(w)) return sameWord ? { k: 'ok' } : { k: 'near', why: 'accent' };
  const g = genderOf(w);
  const fits = (x) => (isPlural(w) ? ['les', 'des'].includes(x)
    : g === 'mf' ? ['le', 'la', 'un', 'une', "l'"].includes(x)
      : g === 'm' ? ['le', 'un'].includes(x) : ['la', 'une'].includes(x));
  if (!art) return { k: 'near', why: 'article' };
  if (art === "l'" && !isPlural(w) && g !== 'mf') return { k: 'near', why: 'hidden' };
  if (!ARTS.includes(art) || !fits(art)) return { k: 'bad', why: 'gender' };
  return sameWord ? { k: 'ok' } : { k: 'near', why: 'accent' };
}

// Course order of the themes (A1 first).
export const THEME_ORDER = ['famille', 'nourriture', 'maison', 'temps', 'calendrier', 'couleurs', 'contraires', 'ville', 'vetements', 'corps',
  'meteo', 'emotions', 'avoir', 'transports', 'metiers', 'relations', 'achats', 'sante', 'ecole', 'administration', 'loisirs', 'petits_mots',
  'cuisine', 'nature', 'animaux', 'pays'];
export function wordCourse() {
  const seen = new Set();
  const out = [];
  for (const id of THEME_ORDER) for (const fr of THEME_BY_ID.get(id)?.words || []) if (!seen.has(fr)) { seen.add(fr); out.push(wordCardId(fr)); }
  return out;
}
