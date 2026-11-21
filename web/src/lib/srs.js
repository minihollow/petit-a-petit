// Spaced repetition (FSRS, via ts-fsrs). A card's state is replayed from its review events,
// so it is the same on every device once the events are synced.
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

const scheduler = fsrs({ enable_fuzz: false, request_retention: 0.9 });
export { Rating, State };
const DAY = 86400000;

// Review event: { kind: 'review', card, rating, ok, n, ms }.
export function buildCards(events) {
  const cards = new Map();
  for (const e of events) {
    if (e.kind !== 'review' || !e.card || !e.rating) continue;
    let c = cards.get(e.card);
    if (!c) { c = { id: e.card, fsrs: createEmptyCard(new Date(e.ts)), reviews: 0, first: e.ts, last: 0, ok: 0, n: 0, lastRating: 0 }; cards.set(e.card, c); }
    const when = new Date(Math.max(e.ts, c.last));
    c.fsrs = scheduler.next(c.fsrs, when, e.rating).card;
    c.reviews++; c.last = when.getTime(); c.ok += e.ok || 0; c.n += e.n || 0; c.lastRating = e.rating;
  }
  return cards;
}

// Rating from the share of right answers in a table (accent or agreement slips count half).
export function ratingFor(ok, near, n) {
  const score = (ok + near * 0.5) / Math.max(1, n);
  if (score >= 1) return Rating.Good;
  if (score >= 0.66) return Rating.Hard;
  return Rating.Again;
}

export const isDue = (c, now = Date.now()) => c.fsrs.due.getTime() <= now;
// "Known": in review with at least a week of stability.
export const isKnown = (c) => c?.fsrs.state === State.Review && c.fsrs.stability >= 7;
export const level = (c) => (!c ? 0 : isKnown(c) ? 3 : c.fsrs.state === State.Review ? 2 : 1);
export const nextInDays = (c, now = Date.now()) => Math.max(0, Math.round((c.fsrs.due.getTime() - now) / DAY));
