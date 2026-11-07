import { useMemo } from 'react';
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';
import { FEATURE_BY_ID } from '../data/countries';
import { mainland } from '../lib/geo';

export default function Silhouette({ id, revealed }: { id: string; revealed?: 'good' | 'bad' | null }) {
  const d = useMemo(() => {
    const f = FEATURE_BY_ID.get(id);
    if (!f) return '';
    const m = mainland(f);
    const [lon, lat] = geoCentroid(m);
    const proj = geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent([[20, 20], [280, 280]], m);
    return geoPath(proj)(m) ?? '';
  }, [id]);
  const color = revealed === 'good' ? 'var(--good)' : revealed === 'bad' ? 'var(--bad)' : 'url(#sil)';
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]">
      <defs>
        <linearGradient id="sil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <path d={d} fill={color} style={{ transition: 'fill .3s' }} stroke="var(--panel-solid)" strokeWidth={1} strokeLinejoin="round" />
    </svg>
  );
}
