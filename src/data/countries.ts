import { feature, merge } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import raw from './countries.json';
import world from './world.json';
import type { Continent, Country } from '../types';

export const COUNTRIES = raw as Country[];
export const BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]));
export const CONTINENTS: Continent[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

export const CONTINENT_EMOJI: Record<Continent, string> = {
  Africa: '🌍',
  Asia: '🌏',
  Europe: '🏰',
  'North America': '🗽',
  'South America': '🌎',
  Oceania: '🏝️',
};

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;

/** One feature per country: pieces sharing an id (e.g. Australia + Ashmore Is.) are merged. */
function buildFeatures(): Feature<Geometry>[] {
  const geoms = topo.objects.countries.geometries;
  const groups = new Map<string, typeof geoms>();
  const out: Feature<Geometry>[] = [];
  for (const g of geoms) {
    if (g.id == null) out.push(feature(topo, g) as Feature<Geometry>);
    else groups.set(g.id as string, [...(groups.get(g.id as string) ?? []), g]);
  }
  for (const [id, gs] of groups) {
    const geometry =
      gs.length === 1
        ? (feature(topo, gs[0]) as Feature<Geometry>).geometry
        : merge(topo, gs as Parameters<typeof merge>[1]);
    out.push({ type: 'Feature', id, properties: {}, geometry });
  }
  return out;
}
export const FEATURES = buildFeatures();
export const FEATURE_BY_ID = new Map(FEATURES.filter((f) => f.id).map((f) => [f.id as string, f]));

/** Countries too small to click reliably get a marker dot on the map. */
export const isTiny = (c: Country) => !c.hasShape || c.area < 2500;

export const filterByContinents = (list: Country[], continents: Continent[]) =>
  continents.length === 0 ? list : list.filter((c) => continents.includes(c.continent));
