import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import Flag from '../components/Flag';
import WorldMap, { type MapClasses } from '../components/WorldMap';
import { BackButton, Bar, Chip, ContinentFilter, Panel } from '../components/ui';
import { BY_ID, CONTINENTS, COUNTRIES, filterByContinents } from '../data/countries';
import { getProgress, mastery, resetProgress, type Card } from '../lib/progress';
import { go } from '../lib/useHashRoute';
import type { Continent, QuizMode } from '../types';
import { MODE_INFO } from './ModeScreen';

const MODES: QuizMode[] = ['map', 'flag', 'capital', 'shape'];
const LEVEL_COLORS = ['var(--land)', 'var(--bad)', 'var(--warn)', '#e2c541', 'var(--accent-2)', 'var(--good)'];
const LEVEL_LABEL = ['Not seen', 'Learning', 'Shaky', 'Getting there', 'Good', 'Mastered'];
const level = (card?: Card) => (card ? card.box : 0);

export default function Stats() {
  const [mode, setMode] = useState<QuizMode>('map');
  const [continents, setContinents] = useState<Continent[]>([]);
  const [version, setVersion] = useState(0);
  const prog = useMemo(() => getProgress(mode), [mode, version]);
  const list = filterByContinents(COUNTRIES, continents);

  const classes = useMemo(() => {
    const cl: MapClasses = {};
    for (const c of COUNTRIES) cl[c.id] = `lvl-${level(prog[c.id])}`;
    return cl;
  }, [prog]);

  const seen = list.filter((c) => prog[c.id]).length;
  const mastered = list.filter((c) => level(prog[c.id]) >= 5).length;
  const attempts = list.reduce((s, c) => s + (prog[c.id]?.seen ?? 0), 0);
  const correct = list.reduce((s, c) => s + (prog[c.id]?.correct ?? 0), 0);
  const avg = list.reduce((s, c) => s + mastery(prog[c.id]), 0) / (list.length || 1);

  const weakest = list
    .filter((c) => prog[c.id] && prog[c.id].box <= 2)
    .sort((a, b) => prog[a.id].correct / prog[a.id].seen - prog[b.id].correct / prog[b.id].seen)
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <style>{LEVEL_COLORS.map((c, i) => `.map-country.lvl-${i}{fill:${c}}`).join('')}</style>
      <div className="flex flex-wrap items-center gap-3">
        <BackButton onClick={() => go('/')} />
        <h1 className="font-display text-2xl font-bold">Your progress</h1>
        <button
          onClick={() => {
            if (confirm('Reset all progress and smart review data? This cannot be undone.')) {
              resetProgress();
              setVersion((v) => v + 1);
            }
          }}
          className="ml-auto text-sm text-muted hover:text-bad"
        >
          Reset progress
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
            {MODE_INFO[m].emoji} {MODE_INFO[m].title}
          </Chip>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Mastery', `${Math.round(avg * 100)}%`],
          ['Mastered', `${mastered} / ${list.length}`],
          ['Seen', `${seen} / ${list.length}`],
          ['Accuracy', attempts ? `${Math.round((correct / attempts) * 100)}%` : '—'],
        ].map(([k, v], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Panel className="p-4">
              <div className="font-display text-2xl font-bold tabular-nums">{v}</div>
              <div className="text-xs text-muted">{k}</div>
            </Panel>
          </motion.div>
        ))}
      </div>

      <div className="mt-5">
        <WorldMap
          classes={classes}
          className="aspect-[960/500] w-full"
          tooltip={(id) => {
            const c = BY_ID.get(id);
            if (!c) return null;
            const card = prog[c.id];
            return `${c.name}: ${LEVEL_LABEL[level(card)]}${card ? ` (${card.correct}/${card.seen})` : ''}`;
          }}
        />
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted">
          {LEVEL_LABEL.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_COLORS[i] }} /> {l}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel className="h-fit p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted">By continent</h2>
          <div className="space-y-3.5">
            {CONTINENTS.map((ct) => {
              const cs = COUNTRIES.filter((c) => c.continent === ct);
              const m = cs.reduce((s, c) => s + mastery(prog[c.id]), 0) / cs.length;
              return (
                <div key={ct}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{ct}</span>
                    <span className="tabular-nums text-muted">{Math.round(m * 100)}%</span>
                  </div>
                  <Bar value={m} />
                </div>
              );
            })}
          </div>
          {weakest.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Needs work</h2>
              <div className="flex flex-wrap gap-1.5">
                {weakest.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg bg-bad/10 px-2 py-1 text-xs font-medium">
                    <Flag cca2={c.cca2} className="w-4" /> {c.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <div>
          <div className="mb-3">
            <ContinentFilter value={continents} onChange={setContinents} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => {
              const card = prog[c.id];
              const lv = level(card);
              return (
                <div key={c.id} className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5">
                  <Flag cca2={c.cca2} className="w-8" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((b) => (
                        <span key={b} className="h-1.5 flex-1 rounded-full" style={{ background: b <= lv ? LEVEL_COLORS[lv] : 'var(--line)' }} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted">{card ? `${card.correct}/${card.seen}` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
