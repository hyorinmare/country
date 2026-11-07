import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { COUNTRIES, filterByContinents } from '../data/countries';
import type { Country } from '../types';
import type { Feedback } from './QuizRunner';

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Wrong options, preferring the same continent so they're plausible. */
export function distractors(target: Country, n = 3, filter?: (c: Country) => boolean): Country[] {
  const ok = (c: Country) => c.id !== target.id && (!filter || filter(c));
  const near = filterByContinents(COUNTRIES, [target.continent]).filter(ok);
  const far = COUNTRIES.filter((c) => ok(c) && c.continent !== target.continent);
  return [...shuffle(near), ...shuffle(far)].slice(0, n);
}

export function optionsFor(target: Country, filter?: (c: Country) => boolean): Country[] {
  return shuffle([target, ...distractors(target, 3, filter)]);
}

interface ChoiceProps {
  options: { id: string; label: ReactNode }[];
  correctId: string;
  feedback: Feedback;
  onPick: (id: string) => void;
}

export function Choices({ options, correctId, feedback, onPick }: ChoiceProps) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (!feedback && i >= 0 && i < options.length) onPick(options[i].id);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [options, feedback, onPick]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o, i) => {
        const state = !feedback ? '' : o.id === correctId ? 'good' : o.id === feedback.picked ? 'bad' : 'dim';
        return (
          <motion.button
            key={o.id}
            whileHover={!feedback ? { y: -2 } : undefined}
            whileTap={!feedback ? { scale: 0.98 } : undefined}
            disabled={!!feedback}
            onClick={() => onPick(o.id)}
            className={`glass flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold transition-colors ${
              state === 'good'
                ? '!border-good !bg-good/15 text-good'
                : state === 'bad'
                  ? 'shake !border-bad !bg-bad/15 text-bad'
                  : state === 'dim'
                    ? 'opacity-45'
                    : 'hover:border-accent/50'
            }`}
          >
            <kbd className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-line font-sans text-xs font-medium text-muted">
              {i + 1}
            </kbd>
            <span className="min-w-0 flex-1">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface TypedProps {
  check: (input: string) => boolean;
  feedback: Feedback;
  onSubmit: (correct: boolean) => void;
  correctLabel: string;
  placeholder: string;
}

export function TypedAnswer({ check, feedback, onSubmit, correctLabel, placeholder }: TypedProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (feedback || !value.trim()) return;
        onSubmit(check(value));
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-2">
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!!feedback}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`glass min-w-0 flex-1 rounded-2xl px-4 py-3.5 text-lg font-medium outline-none focus:border-accent ${
            feedback ? (feedback.correct ? '!border-good text-good' : 'shake !border-bad text-bad') : ''
          }`}
        />
        <button type="submit" disabled={!!feedback} className="btn-primary rounded-2xl px-5 font-semibold disabled:opacity-50">
          Check
        </button>
      </div>
      {feedback && !feedback.correct && (
        <p className="text-center text-muted">
          Answer: <span className="font-semibold text-text">{correctLabel}</span>
        </p>
      )}
      {!feedback && (
        <button type="button" onClick={() => onSubmit(false)} className="self-center text-sm text-muted hover:text-text">
          I don&apos;t know
        </button>
      )}
    </form>
  );
}
