// Grammar chapters (data/grammar.json): rule cards and their exercises.
// A chapter is a card ("gram:articles"): once studied, it comes back in the daily series, with a few exercises.
import DATA from '../data/grammar.json';
import { norm, strip } from './conj.js';

export const CHAPTERS = DATA.chapters;
export const LABELS = DATA.labels;
export const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));
export const gramCardId = (id) => `gram:${id}`;
export const parseGramCard = (id) => (id?.startsWith('gram:') ? CHAPTER_BY_ID.get(id.slice(5)) || null : null);

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// Exercises of a session: all of them when studying the chapter, a few when reviewing.
export const pickExercises = (ch, n) => shuffle(ch.ex).slice(0, n || ch.ex.length);
// Choice options are stored with the right one first: shown in random order.
export const shuffledOptions = (e) => shuffle(e.o.map((text, i) => ({ text, right: i === e.a })));

// The sentence with the blank filled in, to read it aloud.
export const filled = (q, answer) => q.replace(/___/, answer).replace(/\s*\(.*?\)\s*/g, ' ').replace(/^.*→\s*/, '').replace(/\s+/g, ' ').trim();

export function gradeTyped(input, e) {
  const a = norm(input);
  if (!a) return { k: 'bad', why: 'empty' };
  const ok = e.a.map(norm);
  if (ok.includes(a)) return { k: 'ok' };
  if (ok.some((x) => strip(x) === strip(a))) return { k: 'near', why: 'accent' };
  return { k: 'bad' };
}
