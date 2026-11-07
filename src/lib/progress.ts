import { load, save } from './storage';
import type { Country, QuizMode } from '../types';

/** Leitner box per country per mode: 1 = shaky … 5 = mastered. */
export interface Card {
  box: number;
  seen: number;
  correct: number;
  last: number;
}
type ModeProgress = Record<string, Card>;
type AllProgress = Partial<Record<QuizMode, ModeProgress>>;

const KEY = 'progress';
let cache: AllProgress = load<AllProgress>(KEY, {});

export function getProgress(mode: QuizMode): ModeProgress {
  return cache[mode] ?? {};
}

export function recordAnswer(mode: QuizMode, id: string, correct: boolean) {
  const mp = { ...(cache[mode] ?? {}) };
  const card = mp[id] ?? { box: 1, seen: 0, correct: 0, last: 0 };
  mp[id] = {
    box: correct ? Math.min(5, card.seen === 0 ? 3 : card.box + 1) : 1,
    seen: card.seen + 1,
    correct: card.correct + (correct ? 1 : 0),
    last: Date.now(),
  };
  cache = { ...cache, [mode]: mp };
  save(KEY, cache);
}

export function resetProgress() {
  cache = {};
  save(KEY, cache);
}

/** 0..1 — unseen counts as 0, box 5 as 1. */
export function mastery(card?: Card): number {
  return card ? (card.box - 1) / 4 : 0;
}

/**
 * Builds a round: weighted random sample without replacement.
 * Unseen and low-box countries are much more likely to be picked, so
 * mistakes come back quickly and mastered countries only occasionally.
 */
export function buildRound(pool: Country[], mode: QuizMode, length: number): Country[] {
  const prog = getProgress(mode);
  const items = pool.map((c) => {
    const card = prog[c.id];
    const w = card ? (6 - card.box) ** 2 : 12;
    // Exponential-key trick for weighted sampling without replacement.
    return { c, key: Math.random() ** (1 / w) };
  });
  items.sort((a, b) => b.key - a.key);
  const n = length === 0 ? pool.length : Math.min(length, pool.length);
  return items.slice(0, n).map((i) => i.c);
}

// ---- Best scores ----
type Bests = Record<string, number>;
export function getBest(key: string): number {
  return load<Bests>('bests', {})[key] ?? 0;
}
/** Saves if higher; returns true when it's a new record. */
export function submitBest(key: string, score: number): boolean {
  const b = load<Bests>('bests', {});
  if (score <= (b[key] ?? 0)) return false;
  b[key] = score;
  save('bests', b);
  return true;
}
