import { useEffect, useRef } from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import globe from '../data/globe.json';

const topo = globe as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topo, topo.objects.land);
const GRAT = geoGraticule10();

/** Slowly rotating globe drawn on canvas for the home screen. */
export default function Globe({ size = 320 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const proj = geoOrthographic().scale(size / 2 - 4).translate([size / 2, size / 2]).clipAngle(90);
    const path = geoPath(proj, ctx);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let lon = -10;

    const draw = () => {
      const css = getComputedStyle(document.documentElement);
      const accent = css.getPropertyValue('--accent').trim();
      const accent2 = css.getPropertyValue('--accent-2').trim();
      const line = css.getPropertyValue('--line').trim();
      proj.rotate([lon, -18]);
      ctx.clearRect(0, 0, size, size);

      const g = ctx.createRadialGradient(size * 0.35, size * 0.3, size * 0.05, size / 2, size / 2, size / 2);
      g.addColorStop(0, `${accent2}38`);
      g.addColorStop(1, `${accent}1a`);
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      path(GRAT);
      ctx.strokeStyle = line;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      const lg = ctx.createLinearGradient(0, 0, size, size);
      lg.addColorStop(0, accent);
      lg.addColorStop(1, accent2);
      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = lg;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (!reduce) {
        lon += 0.12;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} className="max-w-full" aria-hidden />;
}
