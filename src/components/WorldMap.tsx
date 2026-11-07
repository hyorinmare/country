import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import { BY_ID, COUNTRIES, FEATURES, FEATURE_BY_ID, isTiny } from '../data/countries';
import { mainland } from '../lib/geo';

const W = 960;
const H = 500;
const projection = geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
const path = geoPath(projection);
const SPHERE = path({ type: 'Sphere' }) ?? '';
const GRATICULE = path(geoGraticule10()) ?? '';
const PATHS = FEATURES.map((f, i) => ({ key: (f.id as string) ?? `x${i}`, id: (f.id as string | null) ?? null, d: path(f) ?? '' }));
const MARKERS = COUNTRIES.filter(isTiny).map((c) => {
  const [x, y] = projection([c.latlng[1], c.latlng[0]]) ?? [0, 0];
  return { id: c.id, x, y };
});

export type MapClasses = Record<string, string>;

interface Props {
  classes?: MapClasses;
  onCountryClick?: (id: string) => void;
  focusId?: string | null;
  /** Change this value to zoom back out to the whole world. */
  resetKey?: unknown;
  tooltip?: (id: string) => string | null;
  className?: string;
}

const Paths = memo(function Paths({ classes }: { classes: MapClasses }) {
  return (
    <>
      {PATHS.map((p) => (
        <path key={p.key} d={p.d} data-id={p.id ?? undefined} className={`map-country ${p.id ? classes[p.id] ?? '' : 'off'}`} />
      ))}
    </>
  );
});

export default function WorldMap({ classes = {}, onCountryClick, focusId, resetKey, tooltip, className = '' }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const svg = select(svgRef.current!);
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([[0, 0], [W, H]])
      .clickDistance(4)
      .on('zoom', (e) => setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    svg.call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const zoomTo = (k: number, cx: number, cy: number) => {
    const svg = select(svgRef.current!);
    svg
      .transition()
      .duration(850)
      .call(zoomRef.current!.transform, zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-cx, -cy));
  };

  useEffect(() => {
    if (!focusId) return;
    const f = FEATURE_BY_ID.get(focusId);
    const c = BY_ID.get(focusId);
    if (f && c && !isTiny(c)) {
      const [[x0, y0], [x1, y1]] = path.bounds(mainland(f));
      const k = Math.min(10, 0.7 / Math.max((x1 - x0) / W, (y1 - y0) / H));
      zoomTo(Math.max(1.5, k), (x0 + x1) / 2, (y0 + y1) / 2);
    } else if (c) {
      const m = MARKERS.find((mk) => mk.id === focusId)!;
      zoomTo(10, m.x, m.y);
    }
  }, [focusId]);

  useEffect(() => {
    if (resetKey === undefined || !zoomRef.current) return;
    select(svgRef.current!).transition().duration(600).call(zoomRef.current.transform, zoomIdentity);
  }, [resetKey]);

  const idFromEvent = (e: React.MouseEvent) => (e.target as Element).getAttribute?.('data-id');

  const onClick = (e: React.MouseEvent) => {
    const id = idFromEvent(e);
    if (id && onCountryClick) onCountryClick(id);
  };

  const onMove = (e: React.MouseEvent) => {
    if (!tooltip) return;
    const id = idFromEvent(e);
    const rect = svgRef.current!.getBoundingClientRect();
    if (id) setHover({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
    else setHover(null);
  };

  const zoomBy = (factor: number) => {
    select(svgRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, factor);
  };

  const tip = hover && tooltip ? tooltip(hover.id) : null;
  const markers = useMemo(() => MARKERS, []);

  return (
    <div className={`relative overflow-hidden rounded-3xl glass ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`block h-full w-full touch-none select-none ${onCountryClick ? 'map-clickable' : ''}`}
        onClick={onClick}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          <path d={SPHERE} fill="var(--ocean)" />
          <path d={GRATICULE} fill="none" stroke="var(--line)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          <Paths classes={classes} />
          {markers.map((m) => (
            <circle
              key={m.id}
              cx={m.x}
              cy={m.y}
              r={3.6 / t.k}
              data-id={m.id}
              className={`map-country ${classes[m.id] ?? ''}`}
              style={{ strokeWidth: 1, stroke: 'var(--panel-solid)' }}
            />
          ))}
        </g>
      </svg>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {[
          ['+', () => zoomBy(1.8)],
          ['−', () => zoomBy(1 / 1.8)],
          ['⟳', () => select(svgRef.current!).transition().duration(600).call(zoomRef.current!.transform, zoomIdentity)],
        ].map(([label, fn]) => (
          <button
            key={label as string}
            onClick={fn as () => void}
            className="glass grid h-8 w-8 place-items-center rounded-xl text-sm font-semibold text-muted hover:text-text"
            aria-label={label === '+' ? 'Zoom in' : label === '−' ? 'Zoom out' : 'Reset zoom'}
          >
            {label as string}
          </button>
        ))}
      </div>
      {tip && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-panel-solid px-2.5 py-1 text-xs font-medium shadow-lg ring-1 ring-line"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}
