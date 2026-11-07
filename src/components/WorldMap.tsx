import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import { BY_ID, COUNTRIES, FEATURES, FEATURE_BY_ID, isTiny } from '../data/countries';
import { mainland } from '../lib/geo';
import type { Continent } from '../types';

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

/** Rough lon/lat box per continent: [[west, south], [east, north]]. */
const CONTINENT_BOX: Record<Continent, [[number, number], [number, number]]> = {
  Africa: [[-19, -36], [52, 38]],
  Europe: [[-25, 34], [45, 71]],
  Asia: [[25, -11], [148, 56]],
  'North America': [[-168, 7], [-52, 72]],
  'South America': [[-82, -56], [-34, 13]],
  Oceania: [[110, -48], [180, 20]],
};

/** Zoom transform that frames the given continents (identity = whole world). */
function homeTransform(continents?: Continent[]) {
  if (!continents?.length) return zoomIdentity;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of continents) {
    const [[w, s], [e, n]] = CONTINENT_BOX[c];
    // Sample the box: the projection curves its edges.
    for (let i = 0; i <= 8; i++)
      for (let j = 0; j <= 8; j++) {
        const p = projection([w + ((e - w) * i) / 8, s + ((n - s) * j) / 8]);
        if (!p) continue;
        x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]);
        x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
      }
  }
  const k = Math.max(1, Math.min(8, 0.95 / Math.max((x1 - x0) / W, (y1 - y0) / H)));
  return zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}

interface Props {
  classes?: MapClasses;
  onCountryClick?: (id: string) => void;
  focusId?: string | null;
  /** Change this value to zoom back out to the whole world. */
  resetKey?: unknown;
  tooltip?: (id: string) => string | null;
  className?: string;
  /** Continents to frame by default (and when resetting the zoom). */
  continents?: Continent[];
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

/** Dot markers for tiny countries; their radius is kept constant on screen by the zoom handler. */
const Markers = memo(function Markers({ classes }: { classes: MapClasses }) {
  return (
    <>
      {MARKERS.map((m) => (
        <circle
          key={m.id}
          cx={m.x}
          cy={m.y}
          r={3.6}
          data-id={m.id}
          className={`map-country ${classes[m.id] ?? ''}`}
          style={{ strokeWidth: 1, stroke: 'var(--panel-solid)' }}
        />
      ))}
    </>
  );
});

export default function WorldMap({ classes = {}, onCountryClick, focusId, resetKey, tooltip, className = '', continents }: Props) {
  const home = useMemo(() => homeTransform(continents), [continents?.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const svg = select(svgRef.current!);
    const g = gRef.current!;
    const circles = g.getElementsByTagName('circle');
    // Zoom/pan writes straight to the DOM (no React re-render), batched to one update per frame.
    let raf = 0;
    let pending: { k: number; x: number; y: number } | null = null;
    let lastK = -1;
    const apply = () => {
      raf = 0;
      if (!pending) return;
      const { k, x, y } = pending;
      g.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
      if (k !== lastK) {
        lastK = k;
        const r = String(3.6 / k);
        for (let i = 0; i < circles.length; i++) circles[i].setAttribute('r', r);
      }
    };
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([[0, 0], [W, H]])
      .clickDistance(4)
      .on('start', () => svgRef.current?.classList.add('map-moving'))
      .on('end', () => svgRef.current?.classList.remove('map-moving'))
      .on('zoom', (e) => {
        pending = { k: e.transform.k, x: e.transform.x, y: e.transform.y };
        // Code-driven zooms (initial framing, d3 transitions) apply now; finger/mouse gestures are batched per frame.
        if (!e.sourceEvent) {
          cancelAnimationFrame(raf);
          apply();
        } else if (!raf) raf = requestAnimationFrame(apply);
      });
    svg.call(z).on('dblclick.zoom', null);
    zoomRef.current = z;
    return () => {
      cancelAnimationFrame(raf);
      svg.on('.zoom', null);
    };
  }, []);

  // Frame the chosen continents straight away, and animate when the selection changes.
  const firstHome = useRef(true);
  useEffect(() => {
    const svg = select(svgRef.current!);
    if (firstHome.current) {
      firstHome.current = false;
      svg.call(zoomRef.current!.transform, home);
    } else {
      svg.transition().duration(600).call(zoomRef.current!.transform, home);
    }
  }, [home]);

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
    select(svgRef.current!).transition().duration(600).call(zoomRef.current.transform, home);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className={`map-frame relative overflow-hidden rounded-3xl ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`block h-full w-full touch-none select-none ${onCountryClick ? 'map-clickable' : ''}`}
        onClick={onClick}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <g ref={gRef}>
          <path d={SPHERE} fill="var(--ocean)" />
          <path className="map-graticule" d={GRATICULE} fill="none" stroke="var(--line)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          <Paths classes={classes} />
          <Markers classes={classes} />
        </g>
      </svg>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {[
          ['+', () => zoomBy(1.8)],
          ['−', () => zoomBy(1 / 1.8)],
          ['⟳', () => select(svgRef.current!).transition().duration(600).call(zoomRef.current!.transform, home)],
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
