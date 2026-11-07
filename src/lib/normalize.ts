import { COUNTRIES } from '../data/countries';
import type { Country } from '../types';

export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bsaint\b|\bst\b\.?/g, 'st')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** normalized alias → countries that answer to it (e.g. "congo" → both Congos). */
const INDEX = new Map<string, Country[]>();
for (const c of COUNTRIES) {
  for (const a of c.aliases) {
    const k = norm(a);
    if (!k) continue;
    const list = INDEX.get(k) ?? [];
    if (!list.includes(c)) list.push(c);
    INDEX.set(k, list);
  }
}
const KEYS = [...INDEX.keys()];

/** Exact alias match, preferring countries not in `exclude`. */
export function exactMatch(input: string, exclude?: Set<string>): Country | null {
  const list = INDEX.get(norm(input));
  if (!list) return null;
  return list.find((c) => !exclude?.has(c.id)) ?? list[0];
}

/** Exact match, or a single-typo match on longer names when it's unambiguous. */
export function matchCountry(input: string, exclude?: Set<string>): Country | null {
  const exact = exactMatch(input, exclude);
  if (exact) return exact;
  const n = norm(input);
  if (n.length < 5) return null;
  const hits = new Set<Country>();
  for (const k of KEYS) if (levenshtein(n, k) <= 1) INDEX.get(k)!.forEach((c) => hits.add(c));
  return hits.size === 1 ? [...hits][0] : null;
}

/** Whether `input` is the start of some alias of a country that isn't found yet (other than `self`). */
export function isPrefixOfOther(input: string, self: Country, found: Set<string>): boolean {
  const n = norm(input);
  for (const [k, list] of INDEX) {
    if (k.length > n.length && k.startsWith(n) && list.some((c) => c !== self && !found.has(c.id))) return true;
  }
  return false;
}

export function matchesCapital(input: string, c: Country): boolean {
  const n = norm(input);
  if (!n) return false;
  return c.capital.some((cap) => {
    const k = norm(cap);
    return k === n || (k.length >= 6 && levenshtein(n, k) <= 1);
  });
}
