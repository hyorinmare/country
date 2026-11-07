import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import Flag from '../components/Flag';
import Silhouette from '../components/Silhouette';
import WorldMap, { type MapClasses } from '../components/WorldMap';
import { BackButton, Chip, ContinentFilter, Panel } from '../components/ui';
import { BY_ID, COUNTRIES, filterByContinents, isTiny } from '../data/countries';
import { norm } from '../lib/normalize';
import { load, save } from '../lib/storage';
import { go } from '../lib/useHashRoute';
import type { Continent, Country } from '../types';

type Sort = 'name' | 'area-desc' | 'area-asc';

const fmtArea = (n: number) => `${Math.round(n).toLocaleString('en-US')} km²`;

export default function Learn() {
  const [continents, setContinents] = useState<Continent[]>(() => load('learn:continents', []));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [selected, setSelected] = useState<string>(() => load('learn:selected', 'FRA'));

  const setCont = (v: Continent[]) => {
    setContinents(v);
    save('learn:continents', v);
  };
  const pick = (id: string, scroll = true) => {
    setSelected(id);
    save('learn:selected', id);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const list = useMemo(() => {
    const q = norm(query);
    let l = filterByContinents(COUNTRIES, continents);
    if (q) l = l.filter((c) => c.aliases.some((a) => norm(a).includes(q)) || c.capital.some((cap) => norm(cap).includes(q)));
    if (sort === 'area-desc') l = [...l].sort((a, b) => b.area - a.area);
    if (sort === 'area-asc') l = [...l].sort((a, b) => a.area - b.area);
    return l;
  }, [continents, query, sort]);

  const country = BY_ID.get(selected) ?? COUNTRIES[0];

  const classes = useMemo(() => {
    const cl: MapClasses = {};
    const inList = new Set(filterByContinents(COUNTRIES, continents).map((c) => c.id));
    for (const c of COUNTRIES) if (!inList.has(c.id)) cl[c.id] = 'off';
    for (const b of country.borders) if (cl[b] !== 'off') cl[b] = 'neighbour';
    cl[country.id] = 'target';
    return cl;
  }, [continents, country]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton onClick={() => go('/')} />
        <h1 className="font-display text-2xl font-bold">📚 Learn</h1>
        <span className="text-sm text-muted">Browse every country: click one on the map or in the list.</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div>
          <WorldMap
            classes={classes}
            continents={continents}
            focusId={country.id}
            onCountryClick={(id) => pick(id, false)}
            tooltip={(id) => BY_ID.get(id)?.name ?? null}
            className="aspect-[960/500] w-full"
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warn" /> Selected country
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-good" /> Neighbours
            </span>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={country.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <CountryCard country={country} onPick={pick} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a country or capital…"
            className="glass min-w-0 flex-1 rounded-2xl px-4 py-3 font-medium outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <Chip active={sort === 'name'} onClick={() => setSort('name')}>A–Z</Chip>
            <Chip active={sort === 'area-desc'} onClick={() => setSort('area-desc')}>Largest</Chip>
            <Chip active={sort === 'area-asc'} onClick={() => setSort('area-asc')}>Smallest</Chip>
          </div>
        </div>
        <ContinentFilter value={continents} onChange={setCont} />
        <div className="text-sm text-muted">{list.length} {list.length === 1 ? 'country' : 'countries'}</div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            className={`tile flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:border-accent/50 ${
              c.id === country.id ? '!border-accent ring-1 ring-accent' : ''
            }`}
          >
            <Flag cca2={c.cca2} className="w-10 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{c.name}</div>
              <div className="truncate text-xs text-muted">{c.capital.join(', ')}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CountryCard({ country: c, onPick }: { country: Country; onPick: (id: string) => void }) {
  const neighbours = c.borders.map((b) => BY_ID.get(b)).filter(Boolean) as Country[];
  const facts: [string, string][] = [
    ['Capital', c.capital.join(', ')],
    ['Region', `${c.subregion || c.continent}`],
    ['Area', fmtArea(c.area)],
    ['Languages', c.languages.join(', ') || '—'],
    ['Currency', c.currencies.join(', ') || '—'],
    ['People', c.demonym || '—'],
    ['Calling code', c.callingCode || '—'],
    ['Web domain', c.tld || '—'],
  ];
  return (
    <Panel className="p-5">
      <div className="flex items-start gap-4">
        <Flag cca2={c.cca2} className="w-24 shrink-0 rounded-xl shadow-lg" />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight">{c.name}</h2>
          <p className="mt-0.5 text-sm text-muted">{c.official}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">{c.continent}</span>
            {c.landlocked && <span className="rounded-full bg-warn/15 px-2 py-0.5 font-medium text-warn">Landlocked</span>}
            {isTiny(c) && <span className="rounded-full bg-line px-2 py-0.5 font-medium text-muted">Microstate</span>}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className={k === 'Languages' || k === 'Currency' ? 'col-span-2' : ''}>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{k}</dt>
            <dd className="mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Neighbours {neighbours.length > 0 && `(${neighbours.length})`}
        </div>
        {neighbours.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {neighbours.map((n) => (
              <button
                key={n.id}
                onClick={() => onPick(n.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-line px-2 py-1 text-xs font-medium hover:bg-accent/15"
              >
                <Flag cca2={n.cca2} className="w-4" /> {n.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">No land borders (island or isolated country).</p>
        )}
      </div>

      {c.hasShape && !isTiny(c) && (
        <div className="mx-auto mt-4 aspect-square w-36">
          <Silhouette id={c.id} />
        </div>
      )}
    </Panel>
  );
}
