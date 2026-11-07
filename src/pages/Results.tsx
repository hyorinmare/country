import { motion } from 'framer-motion';
import Flag from '../components/Flag';
import { AnimatedNumber, Panel } from '../components/ui';
import { BY_ID } from '../data/countries';
import type { QuestionResult } from '../types';

interface Props {
  title: string;
  results: QuestionResult[];
  score: number;
  bestStreak: number;
  isRecord: boolean;
  onReplay: () => void;
  onReviewMissed: () => void;
  onMenu: () => void;
}

export default function Results({ title, results, score, bestStreak, isRecord, onReplay, onReviewMissed, onMenu }: Props) {
  const correct = results.filter((r) => r.correct).length;
  const acc = results.length ? correct / results.length : 0;
  const missed = results.filter((r) => !r.correct);
  const verdict = acc === 1 ? 'Flawless! 🏆' : acc >= 0.8 ? 'Excellent! 🌟' : acc >= 0.5 ? 'Nice work! 👏' : 'Keep practising 💪';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Panel className="p-6 text-center sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{verdict}</h1>
          {isRecord && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="mx-auto mt-3 w-fit rounded-full bg-warn/15 px-3 py-1 text-sm font-semibold text-warn"
            >
              New personal best!
            </motion.div>
          )}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              ['Score', <AnimatedNumber key="s" value={score} />],
              ['Accuracy', `${Math.round(acc * 100)}%`],
              ['Best streak', `🔥 ${bestStreak}`],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-2xl bg-line/60 p-3 sm:p-4">
                <div className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{val}</div>
                <div className="mt-1 text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={onReplay} className="btn-primary rounded-2xl px-5 py-3 font-semibold">
              Play again
            </button>
            {missed.length > 0 && (
              <button onClick={onReviewMissed} className="glass rounded-2xl px-5 py-3 font-semibold">
                Retry the {missed.length} missed
              </button>
            )}
            <button onClick={onMenu} className="glass rounded-2xl px-5 py-3 font-semibold text-muted hover:text-text">
              Menu
            </button>
          </div>
        </Panel>
      </motion.div>

      {missed.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted">To review</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {missed.map((r, i) => {
              const c = BY_ID.get(r.id)!;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="glass flex items-center gap-3 rounded-2xl px-3.5 py-2.5"
                >
                  <Flag cca2={c.cca2} className="w-9" />
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="truncate text-muted">
                      {c.capital[0]} · {c.continent}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
