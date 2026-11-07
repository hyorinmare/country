import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BY_ID, COUNTRIES, filterByContinents, isTiny } from '../data/countries';
import { buildRound, recordAnswer } from '../lib/progress';
import type { Country, QuestionResult, QuizMode, QuizSettings } from '../types';
import { AnimatedNumber, BackButton } from '../components/ui';

export const QUESTION_TIME = 15; // seconds, when the timer is on

export type Feedback = { correct: boolean; picked?: string } | null;

export interface QuestionApi {
  country: Country;
  /** Report the outcome. `credit` is 0..1 (map mode gives partial credit for later tries). */
  answer: (correct: boolean, credit?: number, picked?: string) => void;
  feedback: Feedback;
  settings: QuizSettings;
  index: number;
  /** Results of the questions already answered this round. */
  history: QuestionResult[];
}

export function poolFor(mode: QuizMode, s: QuizSettings): Country[] {
  if (s.reviewIds?.length) return s.reviewIds.map((id) => BY_ID.get(id)!).filter(Boolean);
  let list = filterByContinents(COUNTRIES, s.continents);
  if (mode === 'shape') list = list.filter((c) => c.hasShape && !isTiny(c) && c.area >= 5000);
  return list;
}

interface Props {
  mode: QuizMode;
  title: string;
  settings: QuizSettings;
  onExit: () => void;
  onFinish: (results: QuestionResult[], score: number, bestStreak: number) => void;
  children: (api: QuestionApi) => ReactNode;
  /** Wide layout for map mode. */
  wide?: boolean;
}

export default function QuizRunner({ mode, title, settings, onExit, onFinish, children, wide }: Props) {
  const queue = useMemo(
    () => buildRound(poolFor(mode, settings), mode, settings.reviewIds ? 0 : settings.length),
    [mode, settings],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lastGain, setLastGain] = useState<{ pts: number; n: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const results = useRef<QuestionResult[]>([]);
  const country = queue[index];

  const answer = useCallback(
    (correct: boolean, credit = 1, picked?: string) => {
      if (feedback || !country) return;
      const newStreak = correct ? streak + 1 : 0;
      const mult = 1 + Math.min(Math.max(newStreak - 1, 0), 10) * 0.1;
      const speed = settings.timer ? Math.round((timeLeft / QUESTION_TIME) * 50) : 0;
      const pts = correct ? Math.round((100 * credit + speed) * mult) : 0;
      setScore((s) => s + pts);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      setLastGain({ pts, n: Date.now() });
      setFeedback({ correct, picked });
      results.current.push({ id: country.id, correct, points: pts });
      recordAnswer(mode, country.id, correct && credit >= 0.99);
    },
    [feedback, country, streak, settings.timer, timeLeft, mode],
  );

  const next = useCallback(() => {
    if (index + 1 >= queue.length) {
      onFinish(results.current, score, bestStreak);
      return;
    }
    setFeedback(null);
    setIndex((i) => i + 1);
    setTimeLeft(QUESTION_TIME);
  }, [index, queue.length, onFinish, score, bestStreak]);

  // Timer
  useEffect(() => {
    if (!settings.timer || feedback) return;
    if (timeLeft <= 0) {
      answer(false);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => +(s - 0.1).toFixed(1)), 100);
    return () => clearTimeout(t);
  }, [settings.timer, feedback, timeLeft, answer]);

  // Correct answers move on by themselves; wrong ones wait so the player can study the answer.
  useEffect(() => {
    if (!feedback?.correct) return;
    const t = setTimeout(next, 1000);
    return () => clearTimeout(t);
  }, [feedback, next]);

  useEffect(() => {
    if (!feedback || feedback.correct) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    const t = setTimeout(() => window.addEventListener('keydown', on), 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', on);
    };
  }, [feedback, next]);

  if (!country) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4 text-muted">No countries match this filter.</p>
        <BackButton onClick={onExit} />
      </div>
    );
  }

  const gradient = 'linear-gradient(90deg,var(--accent),var(--accent-2))';

  return (
    <div className={`mx-auto w-full px-4 pb-10 pt-4 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div className="mb-4 flex items-center gap-3">
        <BackButton onClick={onExit} />
        <div className="hidden text-sm font-semibold text-muted sm:block">{title}</div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <div className="glass rounded-full px-3 py-1.5 font-medium tabular-nums">
            {index + 1}
            <span className="text-muted"> / {queue.length}</span>
          </div>
          <motion.div
            key={streak}
            initial={{ scale: streak ? 1.25 : 1 }}
            animate={{ scale: 1 }}
            className={`glass rounded-full px-3 py-1.5 font-semibold tabular-nums ${streak >= 3 ? 'text-warn' : 'text-muted'}`}
            title="Streak"
          >
            🔥 {streak}
          </motion.div>
          <div className="glass relative rounded-full px-3.5 py-1.5 font-bold tabular-nums">
            <AnimatedNumber value={score} />
            <AnimatePresence>
              {lastGain && lastGain.pts > 0 && (
                <motion.span
                  key={lastGain.n}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -26 }}
                  transition={{ duration: 0.9 }}
                  className="absolute -top-1 right-1 text-xs font-bold text-good"
                >
                  +{lastGain.pts}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full rounded-full"
          style={{ background: settings.timer && timeLeft < 4 ? 'var(--bad)' : gradient }}
          initial={{ width: settings.timer ? '100%' : '0%' }}
          animate={{
            width: settings.timer ? `${(timeLeft / QUESTION_TIME) * 100}%` : `${(index / queue.length) * 100}%`,
          }}
          transition={{ duration: settings.timer ? 0.1 : 0.4, ease: 'linear' }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
        >
          {children({ country, answer, feedback, settings, index, history: results.current.slice(0, index) })}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {feedback && !feedback.correct && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 flex justify-center">
            <button onClick={next} className="btn-primary rounded-2xl px-6 py-3 font-semibold">
              {index + 1 >= queue.length ? 'See results' : 'Next'} <span className="opacity-70">↵</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
