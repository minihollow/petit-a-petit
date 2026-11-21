// Daily series: cards due for review first, then new cards in the course order.
// A conjugation card = one verb in one tense ("conj:parler:ind:pre"): the whole table is filled in.
import { TENSE_ORDER, tenseApplies } from './conj.js';
import { isDue } from './srs.js';

// Verbs to start each tense with (the rest follows by frequency).
const FIRST = {
  'ind:pre': ['être', 'avoir', 'parler', 'aimer', 'aller', 'faire', 'habiter', 'travailler', 'manger', 'regarder', 'venir', 'prendre',
    'pouvoir', 'vouloir', 'finir', 'choisir', 'dire', 'savoir', 'voir', 'devoir', 'écouter', 'acheter', 'appeler', 'sortir', 'partir',
    'boire', 'lire', 'écrire', 'mettre', 'attendre'],
  pc: ['parler', 'être', 'avoir', 'aller', 'faire', 'manger', 'venir', 'prendre', 'voir', 'finir', 'partir', 'sortir', 'acheter', 'boire',
    'lire', 'écrire', 'mettre', 'dire', 'arriver', 'rester'],
  fp: ['aller', 'faire', 'parler', 'manger', 'venir', 'prendre', 'partir', 'voir', 'acheter', 'travailler'],
  'ind:imp': ['être', 'avoir', 'faire', 'aller', 'parler', 'aimer', 'habiter', 'pouvoir', 'vouloir', 'savoir', 'venir', 'prendre'],
  'imp:pre': ['parler', 'aller', 'venir', 'faire', 'prendre', 'attendre', 'écouter', 'regarder', 'être', 'avoir'],
  'ind:fut': ['être', 'avoir', 'aller', 'faire', 'parler', 'pouvoir', 'vouloir', 'venir', 'voir', 'savoir', 'devoir', 'prendre'],
  'cnd:pre': ['vouloir', 'pouvoir', 'aimer', 'être', 'avoir', 'devoir', 'faire', 'aller', 'préférer', 'falloir'],
  'sub:pre': ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'savoir', 'vouloir', 'venir', 'prendre', 'parler', 'finir', 'partir'],
};
// Course order: [tense, how many new tables] blocks, A1 first. Then everything left, tense by tense.
const STAGES = [['ind:pre', 30], ['pc', 12], ['fp', 8], ['ind:pre', 20], ['ind:imp', 12], ['pc', 20], ['imp:pre', 10], ['ind:fut', 15],
  ['ind:pre', 40], ['cnd:pre', 10], ['ind:imp', 25], ['sub:pre', 12], ['ind:fut', 25], ['fp', 30],
  ...TENSE_ORDER.map((t) => [t, Infinity])];

export const cardId = (inf, tense) => `conj:${inf}:${tense}`;
export function parseCard(id) {
  const m = /^conj:([^:]+):(.+)$/.exec(id || '');
  return m ? { inf: m[1], tense: m[2] } : null;
}

export function curriculum(verbs) {
  const byInf = new Map(verbs.map((v) => [v.inf, v]));
  const order = {};
  for (const t of TENSE_ORDER) {
    const first = (FIRST[t] || []).filter((x) => byInf.has(x));
    order[t] = [...first, ...verbs.map((v) => v.inf).filter((x) => !first.includes(x))];
  }
  const pos = Object.fromEntries(TENSE_ORDER.map((t) => [t, 0]));
  const seen = new Set();
  const out = [];
  for (const [t, n] of STAGES) {
    let k = 0;
    while (k < n && pos[t] < order[t].length) {
      const v = byInf.get(order[t][pos[t]++]);
      if (!tenseApplies(v, t)) continue;
      const id = cardId(v.inf, t);
      if (!seen.has(id)) { seen.add(id); out.push(id); k++; }
    }
  }
  return out;
}

const dayStart = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

// New cards already started today (their first review is today).
export function newToday(cards) {
  const start = dayStart();
  let n = 0;
  for (const c of cards.values()) if (c.first >= start) n++;
  return n;
}

// The next series: due cards (most overdue first), then new ones within today's quota.
export function buildSeries(cards, course, { newPerDay = 4, size = 12 } = {}) {
  const now = Date.now();
  const due = [...cards.values()].filter((c) => isDue(c, now)).sort((a, b) => a.fsrs.due - b.fsrs.due).map((c) => c.id);
  const items = due.slice(0, size);
  let quota = Math.max(0, newPerDay - newToday(cards));
  for (const id of course) {
    if (items.length >= size || quota <= 0) break;
    if (!cards.has(id) && !items.includes(id)) { items.push(id); quota--; }
  }
  return items;
}

export function counts(cards, course, newPerDay) {
  const now = Date.now();
  let due = 0;
  for (const c of cards.values()) if (isDue(c, now)) due++;
  const left = course.filter((id) => !cards.has(id)).length;
  return { due, fresh: Math.min(left, Math.max(0, newPerDay - newToday(cards))), left };
}

// Per day: { 'YYYY-MM-DD': { ms, items } } and the streak (days in a row with at least one table).
export const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function dayStats(events) {
  const days = {};
  for (const e of events) {
    if (e.kind !== 'review') continue;
    const k = dayKey(e.ts);
    const d = (days[k] ||= { ms: 0, items: 0 });
    d.ms += Math.min(e.ms || 0, 5 * 60000); // an item left open for long counts 5 min at most
    d.items++;
  }
  return days;
}
export function streak(days) {
  let n = 0;
  const d = new Date();
  if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
