// The course (data/course.json): 12 units from A1 to A2, each with 6 lessons in a fixed order:
// words, rule, verbs, listening, writing, review test. A lesson is done once a 'lesson' event
// records it, so progress follows the same sync as the cards.
import COURSE from '../data/course.json';
import { WORDS, wordCardId } from './vocab.js';
import { CHAPTER_BY_ID, gramCardId } from './grammar.js';
import { cardId } from './plan.js';
import { TENSES } from './conj.js';

export const UNITS = COURSE.units;
export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));

// Title, Turkish title, icon and minutes of each kind of lesson.
export const LESSON_KIND = {
  words: { k: 'les_words', icon: 'cards', min: 10 },
  rule: { k: 'les_rule', icon: 'rule', min: 10 },
  verbs: { k: 'les_verbs', icon: 'table', min: 10 },
  listen: { k: 'les_listen', icon: 'ear', min: 8 },
  task: { k: 'les_task', icon: 'pen', min: 8 },
  bilan: { k: 'les_bilan', icon: 'flag', min: 10 },
};

export const LESSON_BY_ID = new Map();
for (const u of UNITS) u.lessons.forEach((l, i) => LESSON_BY_ID.set(l.id, { ...l, unit: u, idx: i }));

// One line saying what the lesson is about: the chapter, the verbs, the dialogue, the task.
export function lessonSubtitle(l) {
  if (l.type === 'words') return [`${l.words.length} mots du thème`, `konuyla ilgili ${l.words.length} kelime`];
  if (l.type === 'rule') { const ch = CHAPTER_BY_ID.get(l.chapter); return ch ? [ch.fr, ch.tr] : ['', '']; }
  if (l.type === 'verbs') { const t = TENSES[l.tense]; return [`${l.verbs.join(', ')} · ${t.fr}`, `${l.verbs.join(', ')} · ${t.tr}`]; }
  if (l.type === 'listen') return l.title;
  if (l.type === 'task') return l.prompt;
  return ['Mots, verbes et règle de l\'unité', 'Ünitenin kelimeleri, fiilleri ve kuralı'];
}

// Cards a lesson teaches (they then come back in the reviews).
export function lessonItems(l) {
  if (l.type === 'words') return l.words.filter((w) => WORDS[w]).map(wordCardId);
  if (l.type === 'verbs') return l.verbs.map((v) => cardId(v, l.tense || 'ind:pre'));
  if (l.type === 'rule') return CHAPTER_BY_ID.has(l.chapter) ? [gramCardId(l.chapter)] : [];
  return [];
}

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Review test of a unit: 6 of its words, 2 of its verb tables, its rule.
export function bilanItems(u) {
  const of = (type) => u.lessons.filter((l) => l.type === type).flatMap(lessonItems);
  return [...shuffle(of('words')).slice(0, 6), ...shuffle(of('verbs')).slice(0, 2), ...of('rule')];
}

export function doneLessons(events) {
  const s = new Set();
  for (const e of events || []) if (e.kind === 'lesson' && e.lesson) s.add(e.lesson);
  return s;
}

// Texts written in the writing lessons, newest first.
export function myTexts(events) {
  return (events || []).filter((e) => e.kind === 'lesson' && e.text).sort((a, b) => b.ts - a.ts);
}

export const isWritten = (u) => u.lessons.length > 0;
export function unitProgress(u, done) {
  const n = u.lessons.filter((l) => done.has(l.id)).length;
  return { n, total: u.lessons.length, state: !isWritten(u) ? 'soon' : n === u.lessons.length ? 'done' : n > 0 ? 'cur' : 'todo' };
}

// The next lesson to do: the first one not done, unit after unit (null when the written units are all done).
export function nextLesson(done) {
  for (const u of UNITS) {
    if (!isWritten(u)) return null;
    const l = u.lessons.find((x) => !done.has(x.id));
    if (l) return LESSON_BY_ID.get(l.id);
  }
  return null;
}

// After a lesson: the next one in its unit, else the first of the next written unit.
export function lessonAfter(id) {
  const l = LESSON_BY_ID.get(id);
  if (!l) return null;
  if (l.idx + 1 < l.unit.lessons.length) return LESSON_BY_ID.get(l.unit.lessons[l.idx + 1].id);
  const nu = UNITS[UNITS.indexOf(l.unit) + 1];
  return nu && isWritten(nu) ? LESSON_BY_ID.get(nu.lessons[0].id) : null;
}
