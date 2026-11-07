import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import Flag from '../components/Flag';
import WorldMap, { type MapClasses } from '../components/WorldMap';
import { BackButton, Bar, Chip, ContinentFilter, Panel } from '../components/ui';
import { BY_ID, CONTINENTS, CONTINENT_EMOJI, COUNTRIES, filterByContinents } from '../data/countries';
import { exactMatch, isPrefixOfOther, matchCountry } from '../lib/normalize';
import { getBest, submitBest } from '../lib/progress';
import { load, save } from '../lib/storage';
import { go } from '../lib/useHashRoute';
import type { Continent } from '../types';

const DURATIONS = [5, 10, 15, 0]; // minutes, 0 = no limit

/** Free mode only: these countries aren't answers, and their territory is shown as part of another one. */
const MERGED: Record<string, string> = { ISR: 'PSE' };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

type Phase = 'setup' | 'play' | 'done';

export default function FreeMode() {
  const [minutes, setMinutes] = useState<number>(() => load('free:minutes', 15));
  const [continents, setContinents] = useState<Continent[]>(() => load('free:continents', []));
  const [phase, setPhase] = useState<Phase>('setup');
  const [found, setFound] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<{ text: string; ok: boolean; n: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [record, setRecord] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<number>();

  const pool = useMemo(() => filterByContinents(COUNTRIES, continents).filter((c) => !(c.id in MERGED)), [continents]);
  const poolIds = useMemo(() => new Set(pool.map((c) => c.id)), [pool]);
  const foundSet = useMemo(() => new Set(found), [found]);
  const limit = minutes * 60;
  const bestKey = `free:${minutes}:${continents.slice().sort().join(',') || 'world'}`;

  const finish = () => {
    setPhase('done');
    setRecord(submitBest(bestKey, found.length));
  };

  // Clock
  useEffect(() => {
    if (phase !== 'play') return;
    const t0 = Date.now() - elapsed * 1000;
    const iv = setInterval(() => setElapsed((Date.now() - t0) / 1000), 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    if (phase === 'play' && limit > 0 && elapsed >= limit) finish();
    if (phase === 'play' && found.length === pool.length && pool.length > 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, found, phase]);

  const accept = (id: string) => {
    const c = BY_ID.get(id)!;
    setFound((f) => (f.includes(id) ? f : [id, ...f]));
    setInput('');
    setToast({ text: c.name, ok: true, n: Date.now() });
  };

  const onChange = (v: string) => {
    setInput(v);
    window.clearTimeout(pendingRef.current);
    const c = exactMatch(v, foundSet);
    if (!c || foundSet.has(c.id) || !poolIds.has(c.id)) return;
    // "Niger" could be the start of "Nigeria": wait for a short pause before accepting.
    if (isPrefixOfOther(v, c, foundSet)) {
      pendingRef.current = window.setTimeout(() => accept(c.id), 900);
    } else {
      accept(c.id);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.clearTimeout(pendingRef.current);
    if (!input.trim()) return;
    const c = matchCountry(input, foundSet);
    if (c && poolIds.has(c.id) && !foundSet.has(c.id)) return accept(c.id);
    setShake(true);
    inputRef.current?.select();
    window.setTimeout(() => setShake(false), 450);
    setToast({
      text:
        c && foundSet.has(c.id)
          ? `${c.name}: already found`
          : c && !(c.id in MERGED)
            ? `${c.name} isn't in this region`
            : 'Not recognised',
      ok: false,
      n: Date.now(),
    });
  };

  const startGame = () => {
    save('free:minutes', minutes);
    save('free:continents', continents);
    setFound([]);
    setElapsed(0);
    setInput('');
    setToast(null);
    setPhase('play');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const classes = useMemo(() => {
    const cl: MapClasses = {};
    for (const c of COUNTRIES) {
      if (!poolIds.has(c.id)) cl[c.id] = 'off';
      else if (foundSet.has(c.id)) cl[c.id] = phase === 'done' ? 'good' : 'found';
      else if (phase === 'done') cl[c.id] = 'bad';
    }
    for (const [from, into] of Object.entries(MERGED)) cl[from] = poolIds.has(into) ? cl[into] ?? '' : 'off';
    return cl;
  }, [poolIds, foundSet, phase]);

  const perContinent = CONTINENTS.map((ct) => {
    const all = pool.filter((c) => c.continent === ct);
    return { ct, total: all.length, got: all.filter((c) => foundSet.has(c.id)).length };
  }).filter((x) => x.total > 0);

  if (phase === 'setup') {
    const best = getBest(bestKey);
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <BackButton onClick={() => go('/')} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Panel className="mt-5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/15 text-3xl">⚡</div>
              <div>
                <h1 className="font-display text-3xl font-bold">Free mode</h1>
                <p className="mt-1 text-muted">
                  Name as many countries as you can. Each one you name lights up on the map. How many of the {pool.length} can you get?
                </p>
              </div>
            </div>
            <div className="mt-7 mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Region</div>
            <ContinentFilter value={continents} onChange={setContinents} />
            <div className="mt-7 mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Time limit</div>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip key={d} active={minutes === d} onClick={() => setMinutes(d)}>
                  {d === 0 ? '∞ No limit' : `${d} min`}
                </Chip>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startGame}
                className="btn-primary flex-1 rounded-2xl py-4 text-lg font-bold"
              >
                Start
              </motion.button>
              {best > 0 && (
                <div className="text-right text-sm">
                  <div className="text-muted">Best</div>
                  <div className="font-display text-xl font-bold tabular-nums">
                    {best} / {pool.length}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">
              Common short names work too, like USA, UK, DRC or Ivory Coast. A single typo is forgiven on longer names; press Enter to check.
            </p>
          </Panel>
        </motion.div>
      </div>
    );
  }

  const missed = pool.filter((c) => !foundSet.has(c.id));
  const remaining = limit > 0 ? Math.max(0, limit - elapsed) : elapsed;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BackButton onClick={() => (phase === 'done' ? setPhase('setup') : finish())} label={phase === 'done' ? 'Back' : 'Give up'} />
        <div className="ml-auto flex items-center gap-2 text-sm">
          <div
            className={`glass rounded-full px-3.5 py-1.5 font-semibold tabular-nums ${
              limit > 0 && remaining < 30 && phase === 'play' ? 'text-bad' : ''
            }`}
          >
            ⏱️ {fmt(remaining)}
          </div>
          <div className="glass rounded-full px-3.5 py-1.5 font-bold tabular-nums">
            <span className="text-gradient">{found.length}</span>
            <span className="text-muted"> / {pool.length}</span>
          </div>
        </div>
      </div>

      {phase === 'done' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Panel className="mb-4 flex flex-wrap items-center gap-4 p-5">
            <div>
              <div className="font-display text-3xl font-bold">
                {found.length} <span className="text-lg text-muted">/ {pool.length} countries</span>
              </div>
              <div className="text-sm text-muted">
                {Math.round((found.length / pool.length) * 100)}% in {fmt(elapsed)}
                {record && <span className="ml-2 font-semibold text-warn">New personal best!</span>}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={startGame} className="btn-primary rounded-2xl px-5 py-3 font-semibold">
                Play again
              </button>
              <button onClick={() => go('/')} className="glass rounded-2xl px-5 py-3 font-semibold text-muted hover:text-text">
                Menu
              </button>
            </div>
          </Panel>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          {phase === 'play' && (
            <form onSubmit={onSubmit} className="relative mb-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Type a country name…"
                autoComplete="off"
                spellCheck={false}
                className={`glass w-full rounded-2xl px-5 py-4 text-lg font-medium outline-none focus:border-accent ${shake ? 'shake' : ''}`}
              />
              <AnimatePresence>
                {toast && (
                  <motion.div
                    key={toast.n}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1 text-sm font-semibold ${
                      toast.ok ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
                    }`}
                  >
                    {toast.ok ? '✓ ' : ''}
                    {toast.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          )}
          <WorldMap
            classes={classes}
            continents={continents}
            className="aspect-[960/500] w-full"
            tooltip={
              phase === 'done'
                ? (raw) => {
                    const id = MERGED[raw] ?? raw;
                    return poolIds.has(id) ? BY_ID.get(id)?.name ?? null : null;
                  }
                : undefined
            }
          />
          {phase === 'done' && missed.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted">You missed {missed.length}</h2>
              <div className="flex flex-wrap gap-2">
                {missed.map((c) => (
                  <span key={c.id} className="tile inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm">
                    <Flag cca2={c.cca2} className="w-5" />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <Panel className="h-fit p-5">
          <div className="space-y-3.5">
            {perContinent.map(({ ct, total, got }) => (
              <div key={ct}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">
                    {CONTINENT_EMOJI[ct]} {ct}
                  </span>
                  <span className="tabular-nums text-muted">
                    {got}/{total}
                  </span>
                </div>
                <Bar value={got / total} color={got === total ? 'var(--good)' : undefined} />
              </div>
            ))}
          </div>
          {found.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Latest</div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {found.slice(0, 30).map((id) => {
                    const c = BY_ID.get(id)!;
                    return (
                      <motion.div key={id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-sm">
                        <Flag cca2={c.cca2} className="w-5" />
                        {c.name}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
