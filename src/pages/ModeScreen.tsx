import { motion } from 'framer-motion';
import { useState } from 'react';
import { BackButton, Chip, ContinentFilter, Panel } from '../components/ui';
import { getBest, submitBest } from '../lib/progress';
import { load, save } from '../lib/storage';
import { go } from '../lib/useHashRoute';
import QuizRunner, { poolFor } from '../modes/QuizRunner';
import { CapitalQuestion, FlagQuestion, MapQuestion, ShapeQuestion } from '../modes/Questions';
import type { QuestionResult, QuizMode, QuizSettings } from '../types';
import Results from './Results';

export const MODE_INFO: Record<QuizMode, { title: string; emoji: string; blurb: string; typed: boolean }> = {
  map: { title: 'Find on map', emoji: '📍', blurb: 'We name a country and you find it on the map. You get three tries.', typed: false },
  flag: { title: 'Guess the flag', emoji: '🚩', blurb: 'Name the country that a flag belongs to.', typed: true },
  capital: { title: 'Capitals', emoji: '🏛️', blurb: 'Match countries with their capital cities.', typed: true },
  shape: { title: 'Silhouettes', emoji: '🗺️', blurb: 'Recognise a country from its outline alone.', typed: true },
};

const DEFAULTS: QuizSettings = {
  continents: [],
  length: 10,
  timer: false,
  typed: false,
  capitalDirection: 'country-to-capital',
};

type Phase =
  | { kind: 'setup' }
  | { kind: 'play'; settings: QuizSettings; n: number }
  | { kind: 'results'; settings: QuizSettings; results: QuestionResult[]; score: number; bestStreak: number; record: boolean };

const bestKey = (mode: QuizMode, s: QuizSettings) => `${mode}:${s.length}:${s.timer ? 't' : ''}${s.typed ? 'w' : ''}`;

export default function ModeScreen({ mode }: { mode: QuizMode }) {
  const info = MODE_INFO[mode];
  const [settings, setSettings] = useState<QuizSettings>(() => ({ ...DEFAULTS, ...load(`settings:${mode}`, {}) }));
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  const update = (patch: Partial<QuizSettings>) => {
    const s = { ...settings, ...patch };
    setSettings(s);
    save(`settings:${mode}`, s);
  };
  const start = (s: QuizSettings) => setPhase({ kind: 'play', settings: s, n: Date.now() });
  const poolSize = poolFor(mode, settings).length;

  if (phase.kind === 'play') {
    const Q = { map: MapQuestion, flag: FlagQuestion, capital: CapitalQuestion, shape: ShapeQuestion }[mode];
    return (
      <QuizRunner
        key={phase.n}
        mode={mode}
        title={info.title}
        settings={phase.settings}
        wide={mode === 'map'}
        onExit={() => setPhase({ kind: 'setup' })}
        onFinish={(results, score, bestStreak) => {
          // Practice rounds on missed countries don't count toward records.
          const record = !phase.settings.reviewIds && phase.settings.continents.length === 0 && submitBest(bestKey(mode, phase.settings), score);
          setPhase({ kind: 'results', settings: phase.settings, results, score, bestStreak, record });
        }}
      >
        {(api) => <Q api={api} />}
      </QuizRunner>
    );
  }

  if (phase.kind === 'results') {
    return (
      <Results
        title={info.title}
        results={phase.results}
        score={phase.score}
        bestStreak={phase.bestStreak}
        isRecord={phase.record}
        onReplay={() => start({ ...phase.settings, reviewIds: undefined })}
        onReviewMissed={() => start({ ...phase.settings, reviewIds: phase.results.filter((r) => !r.correct).map((r) => r.id) })}
        onMenu={() => go('/')}
      />
    );
  }

  const best = getBest(bestKey(mode, settings));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BackButton onClick={() => go('/')} />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Panel className="mt-5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/15 text-3xl">{info.emoji}</div>
            <div>
              <h1 className="font-display text-3xl font-bold">{info.title}</h1>
              <p className="mt-1 text-muted">{info.blurb}</p>
            </div>
          </div>

          <Section label="Region">
            <ContinentFilter value={settings.continents} onChange={(continents) => update({ continents })} />
          </Section>

          <Section label="Round length">
            <div className="flex flex-wrap gap-2">
              {[10, 20, 0].map((n) => (
                <Chip key={n} active={settings.length === n} onClick={() => update({ length: n })}>
                  {n === 0 ? `All (${poolSize})` : `${n} questions`}
                </Chip>
              ))}
            </div>
          </Section>

          {mode === 'capital' && (
            <Section label="Direction">
              <div className="flex flex-wrap gap-2">
                <Chip active={settings.capitalDirection === 'country-to-capital'} onClick={() => update({ capitalDirection: 'country-to-capital' })}>
                  Country → Capital
                </Chip>
                <Chip active={settings.capitalDirection === 'capital-to-country'} onClick={() => update({ capitalDirection: 'capital-to-country' })}>
                  Capital → Country
                </Chip>
              </div>
            </Section>
          )}

          <Section label="Options">
            <div className="flex flex-wrap gap-2">
              <Chip active={settings.timer} onClick={() => update({ timer: !settings.timer })}>
                ⏱️ Timer (15s, speed bonus)
              </Chip>
              {info.typed && (
                <Chip active={settings.typed} onClick={() => update({ typed: !settings.typed })}>
                  ⌨️ Hard mode: type answers
                </Chip>
              )}
            </div>
          </Section>

          <div className="mt-8 flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => start(settings)}
              className="btn-primary flex-1 rounded-2xl py-4 text-lg font-bold"
            >
              Start
            </motion.button>
            {best > 0 && (
              <div className="text-right text-sm">
                <div className="text-muted">Best</div>
                <div className="font-display text-xl font-bold tabular-nums">{best.toLocaleString('en-US')}</div>
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">
            Smart review is on: the countries you miss come back more often, and the ones you know show up less.
          </p>
        </Panel>
      </motion.div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      {children}
    </div>
  );
}
