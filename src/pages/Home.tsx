import { motion } from 'framer-motion';
import Globe from '../components/Globe';
import { Bar } from '../components/ui';
import { COUNTRIES } from '../data/countries';
import { getBest, getProgress, mastery } from '../lib/progress';
import { go } from '../lib/useHashRoute';
import type { QuizMode } from '../types';
import { MODE_INFO } from './ModeScreen';

const MODES: QuizMode[] = ['map', 'flag', 'capital', 'shape'];

function modeMastery(mode: QuizMode) {
  const p = getProgress(mode);
  return COUNTRIES.reduce((s, c) => s + mastery(p[c.id]), 0) / COUNTRIES.length;
}

export default function Home() {
  const freeBest = getBest('free:15:world');
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="grid items-center gap-8 py-8 md:grid-cols-[1.2fr_1fr] md:py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-semibold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good" /> {COUNTRIES.length} countries · 5 game modes
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
            Learn the world, <span className="text-gradient">one country at a time.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Maps, flags, capitals and shapes. Smart review brings back the countries you miss until you know them.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => go('/free')} className="btn-primary rounded-2xl px-6 py-3.5 font-bold">
              ⚡ Play free mode
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => go('/stats')} className="glass rounded-2xl px-6 py-3.5 font-semibold">
              📊 My progress
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative mx-auto"
        >
          <div className="absolute inset-6 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative">
            <Globe size={340} />
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModeCard
          i={0}
          emoji="⚡"
          title="Free mode"
          blurb="Name as many countries as you can against the clock."
          footer={freeBest ? `Best (15 min): ${freeBest} / ${COUNTRIES.length}` : 'Can you name all 197?'}
          onClick={() => go('/free')}
          featured
        />
        {MODES.map((m, i) => {
          const info = MODE_INFO[m];
          const mm = modeMastery(m);
          return (
            <ModeCard
              key={m}
              i={i + 1}
              emoji={info.emoji}
              title={info.title}
              blurb={info.blurb}
              mastery={mm}
              footer={`${Math.round(mm * 100)}% mastered`}
              onClick={() => go(`/play/${m}`)}
            />
          );
        })}
      </section>
    </div>
  );
}

function ModeCard(props: {
  i: number;
  emoji: string;
  title: string;
  blurb: string;
  footer: string;
  mastery?: number;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + props.i * 0.06 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={props.onClick}
      className={`glass group relative overflow-hidden rounded-3xl p-6 text-left ${props.featured ? 'ring-2 ring-accent/40' : ''}`}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl transition group-hover:bg-accent/25" />
      <div className="relative">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-2xl">{props.emoji}</div>
        <h3 className="font-display text-xl font-bold">{props.title}</h3>
        <p className="mt-1 min-h-[2.75rem] text-sm text-muted">{props.blurb}</p>
        <div className="mt-4">
          {props.mastery !== undefined && <Bar value={props.mastery} />}
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{props.footer}</span>
            <span className="font-semibold text-accent transition group-hover:translate-x-1">Play →</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
