import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { CONTINENTS, CONTINENT_EMOJI } from '../data/countries';
import type { Continent } from '../types';

export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString('en-US'));
  useEffect(() => spring.set(value), [value, spring]);
  return <motion.span>{display}</motion.span>;
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? 'btn-primary' : 'glass text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

export function ContinentFilter({ value, onChange }: { value: Continent[]; onChange: (v: Continent[]) => void }) {
  const toggle = (c: Continent) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={value.length === 0} onClick={() => onChange([])}>
        🌐 World
      </Chip>
      {CONTINENTS.map((c) => (
        <Chip key={c} active={value.includes(c)} onClick={() => toggle(c)}>
          {CONTINENT_EMOJI[c]} {c}
        </Chip>
      ))}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl ${className}`}>{children}</div>;
}

export function BackButton({ onClick, label = 'Menu' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-text">
      <span aria-hidden>←</span> {label}
    </button>
  );
}

export function Bar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.round(value * 100)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
    </div>
  );
}
