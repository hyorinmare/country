import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import Flag from '../components/Flag';
import Silhouette from '../components/Silhouette';
import WorldMap, { type MapClasses } from '../components/WorldMap';
import { BY_ID, COUNTRIES } from '../data/countries';
import { matchCountry, matchesCapital } from '../lib/normalize';
import { poolFor, type QuestionApi } from './QuizRunner';
import { Choices, TypedAnswer, optionsFor } from './Answers';

function Prompt({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 text-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</div>
      <div className="font-display text-2xl font-bold sm:text-3xl">{children}</div>
    </div>
  );
}

function Reveal({ api }: { api: QuestionApi }) {
  if (!api.feedback) return null;
  const c = api.country;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-2xl glass px-4 py-2.5"
    >
      <Flag cca2={c.cca2} className="w-9" />
      <div className="text-sm">
        <div className="font-semibold">{c.name}</div>
        <div className="text-muted">
          Capital: {c.capital.join(', ')} · {c.continent}
        </div>
      </div>
    </motion.div>
  );
}

/** Name-based answer area shared by flag & shape questions. */
function NameAnswers({ api }: { api: QuestionApi }) {
  const { country, feedback, answer, settings } = api;
  const opts = useMemo(() => optionsFor(country), [country]);
  if (settings.typed) {
    return (
      <TypedAnswer
        placeholder="Type the country…"
        correctLabel={country.name}
        feedback={feedback}
        check={(v) => matchCountry(v)?.id === country.id}
        onSubmit={(ok) => answer(ok)}
      />
    );
  }
  return (
    <Choices
      options={opts.map((o) => ({ id: o.id, label: o.name }))}
      correctId={country.id}
      feedback={feedback}
      onPick={(id) => answer(id === country.id, 1, id)}
    />
  );
}

export function FlagQuestion({ api }: { api: QuestionApi }) {
  return (
    <div>
      <Prompt eyebrow="Guess the flag">Which country is this?</Prompt>
      <div className="mx-auto mb-7 w-full max-w-sm">
        <Flag cca2={api.country.cca2} className="w-full rounded-2xl shadow-2xl" />
      </div>
      <NameAnswers api={api} />
      {api.settings.typed && <Reveal api={api} />}
    </div>
  );
}

export function ShapeQuestion({ api }: { api: QuestionApi }) {
  const r = api.feedback ? (api.feedback.correct ? 'good' : 'bad') : null;
  return (
    <div>
      <Prompt eyebrow="Shape silhouette">Which country has this shape?</Prompt>
      <div className="mx-auto mb-6 aspect-square w-full max-w-[18rem]">
        <Silhouette id={api.country.id} revealed={r} />
      </div>
      <NameAnswers api={api} />
      <Reveal api={api} />
    </div>
  );
}

export function CapitalQuestion({ api }: { api: QuestionApi }) {
  const { country, feedback, answer, settings } = api;
  const toCapital = settings.capitalDirection === 'country-to-capital';
  const opts = useMemo(() => optionsFor(country), [country]);
  return (
    <div>
      {toCapital ? (
        <Prompt eyebrow="Capitals">
          <span className="inline-flex flex-wrap items-center justify-center gap-3">
            What is the capital of
            <span className="inline-flex items-center gap-2 text-gradient">
              <Flag cca2={country.cca2} className="w-9" /> {country.name}?
            </span>
          </span>
        </Prompt>
      ) : (
        <Prompt eyebrow="Capitals">
          <span className="text-gradient">{country.capital[0]}</span> is the capital of…
        </Prompt>
      )}
      {settings.typed ? (
        <TypedAnswer
          placeholder={toCapital ? 'Type the capital…' : 'Type the country…'}
          correctLabel={toCapital ? country.capital.join(' / ') : country.name}
          feedback={feedback}
          check={(v) => (toCapital ? matchesCapital(v, country) : matchCountry(v)?.id === country.id)}
          onSubmit={(ok) => answer(ok)}
        />
      ) : (
        <Choices
          options={opts.map((o) => ({ id: o.id, label: toCapital ? o.capital[0] : o.name }))}
          correctId={country.id}
          feedback={feedback}
          onPick={(id) => answer(id === country.id, 1, id)}
        />
      )}
      <Reveal api={api} />
    </div>
  );
}

const CREDIT = [1, 0.6, 0.3];

export function MapQuestion({ api }: { api: QuestionApi }) {
  const { country, feedback, answer, settings } = api;
  const [wrong, setWrong] = useState<string[]>([]);
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const inPool = useMemo(() => new Set(poolFor('map', settings).map((c) => c.id)), [settings]);
  const triesLeft = 3 - wrong.length;

  const classes = useMemo(() => {
    const cl: MapClasses = {};
    if (!settings.reviewIds?.length && settings.continents.length) {
      for (const c of COUNTRIES) if (!inPool.has(c.id)) cl[c.id] = 'off';
    }
    // Countries from earlier questions stay coloured: green if found, red if missed.
    for (const r of api.history) cl[r.id] = r.correct ? 'done-good' : 'done-bad';
    for (const id of wrong) cl[id] = 'bad';
    if (feedback) cl[country.id] = feedback.correct ? 'good' : 'target';
    return cl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrong, feedback, country, inPool, settings, api.history.length]);

  const onClick = (id: string) => {
    // Off-region, already-answered and already-guessed countries don't use up a try.
    if (feedback || classes[id] === 'off' || classes[id]?.startsWith('done') || wrong.includes(id)) return;
    if (id === country.id) {
      answer(true, CREDIT[wrong.length]);
      return;
    }
    const w = [...wrong, id];
    setWrong(w);
    setLastWrong(id);
    if (w.length >= 3) answer(false);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Find</span>
        <span className="inline-flex items-center gap-2.5 font-display text-2xl font-bold sm:text-3xl">
          <Flag cca2={country.cca2} className="w-9" /> {country.name}
        </span>
        <span className="flex gap-1" aria-label={`${triesLeft} tries left`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < triesLeft ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </span>
      </div>
      <WorldMap
        classes={classes}
        continents={settings.reviewIds?.length ? undefined : settings.continents}
        onCountryClick={onClick}
        focusId={feedback && !feedback.correct ? country.id : null}
        resetKey={api.index}
        className="aspect-[960/500] w-full"
      />
      <div className="mt-3 h-6 text-center text-sm text-muted">
        {feedback ? (
          feedback.correct ? (
            <span className="font-semibold text-good">Correct!</span>
          ) : (
            <span>
              Here&apos;s <span className="font-semibold text-text">{country.name}</span>, highlighted in orange.
            </span>
          )
        ) : lastWrong ? (
          <span>
            That&apos;s <span className="font-semibold text-bad">{BY_ID.get(lastWrong)?.name}</span>. Try again.
          </span>
        ) : (
          <span>Scroll or pinch to zoom. Small countries are shown as dots.</span>
        )}
      </div>
    </div>
  );
}
