// Generates src/data/countries.json and src/data/world.json from npm data packages.
// Run with: node scripts/build-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const all = require('world-countries');
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'));

const EXTRA = ['XK', 'TW', 'PS', 'VA'];
const NAME_OVERRIDE = { CG: 'Republic of the Congo', CD: 'DR Congo', VA: 'Vatican City', MK: 'North Macedonia' };
const EXTRA_ALIASES = {
  US: ['USA', 'US', 'America', 'United States of America', 'The States'],
  GB: ['UK', 'Great Britain', 'Britain', 'United Kingdom'],
  AE: ['UAE', 'Emirates'],
  CD: ['DRC', 'Congo-Kinshasa', 'Democratic Republic of the Congo', 'Congo', 'Zaire'],
  CG: ['Congo-Brazzaville', 'Congo Republic', 'Congo'],
  CZ: ['Czech Republic', 'Czechia'],
  MM: ['Burma'],
  TL: ['East Timor'],
  SZ: ['Swaziland', 'Eswatini'],
  MK: ['Macedonia'],
  CV: ['Cape Verde', 'Cabo Verde'],
  VA: ['Vatican', 'Holy See'],
  TR: ['Turkey', 'Türkiye', 'Turkiye'],
  KR: ['South Korea', 'Korea'],
  KP: ['North Korea'],
  CI: ['Ivory Coast', "Côte d'Ivoire"],
  BA: ['Bosnia', 'Bosnia and Herzegovina', 'Bosnia Herzegovina'],
  NL: ['Holland', 'The Netherlands'],
  GM: ['Gambia', 'The Gambia'],
  BS: ['Bahamas', 'The Bahamas'],
  FM: ['Micronesia'],
  PS: ['Palestine', 'State of Palestine'],
  TW: ['Taiwan', 'Republic of China'],
  CN: ['China', "People's Republic of China", 'PRC'],
  KN: ['Saint Kitts and Nevis', 'St Kitts and Nevis', 'St. Kitts and Nevis'],
  LC: ['Saint Lucia', 'St Lucia', 'St. Lucia'],
  VC: ['Saint Vincent and the Grenadines', 'St Vincent', 'Saint Vincent'],
  ST: ['Sao Tome and Principe', 'São Tomé and Príncipe', 'Sao Tome'],
  LA: ['Laos'], RU: ['Russia'], SY: ['Syria'], VN: ['Vietnam', 'Viet Nam'],
  BN: ['Brunei'], BO: ['Bolivia'], VE: ['Venezuela'], IR: ['Iran'], MD: ['Moldova'], TZ: ['Tanzania'],
};
const CONTINENT = (c) => {
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'South America' : 'North America';
  return c.region;
};

const geoms = topo.objects.countries.geometries;
// Several shapes can share one ISO code (e.g. Australia + Ashmore & Cartier Is.), so keep them all.
const byNum = new Map();
for (const g of geoms) if (g.id) byNum.set(g.id, [...(byNum.get(g.id) ?? []), g]);
// Shapes without an ISO code, attached to the country they're internationally recognised as part of.
const BY_NAME = { XK: ['Kosovo'], SO: ['Somaliland'], CY: ['N. Cyprus'] };

const out = [];
for (const c of all) {
  if (!(c.unMember || EXTRA.includes(c.cca2))) continue;
  const shapes = [...(byNum.get(c.ccn3) ?? []), ...geoms.filter((g) => BY_NAME[c.cca2]?.includes(g.properties.name))];
  const name = NAME_OVERRIDE[c.cca2] ?? c.name.common;
  const aliases = new Set([name, c.name.common, c.name.official, ...(EXTRA_ALIASES[c.cca2] ?? [])]);
  for (const a of c.altSpellings) if (a.length > 3 && !/\(/.test(a)) aliases.add(a);
  for (const g of shapes) g.id = c.cca3;
  out.push({
    id: c.cca3,
    cca2: c.cca2.toLowerCase(),
    name,
    aliases: [...aliases],
    capital: c.capital ?? [],
    continent: CONTINENT(c),
    latlng: c.latlng,
    area: c.area,
    hasShape: shapes.length > 0,
  });
}
// Non-playable shapes (Greenland, W. Sahara, Antarctica...) stay on the map with a null id.
const playable = new Set(out.map((c) => c.id));
for (const g of geoms) {
  if (!playable.has(g.id)) g.id = null;
  delete g.properties;
}
out.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync('src/data/countries.json', JSON.stringify(out));
writeFileSync('src/data/world.json', JSON.stringify(topo));
console.log(`${out.length} countries, ${out.filter((c) => !c.hasShape).map((c) => c.name)} without shape`);
console.log('no capital:', out.filter((c) => !c.capital.length).map((c) => c.name));

// Light land outline for the rotating globe on the home page.
const land = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'));
writeFileSync('src/data/globe.json', JSON.stringify(land));
