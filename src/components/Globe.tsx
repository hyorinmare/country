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
    // Full retina sharpness isn't needed for a decorative globe; 1.5x keeps phones fast.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const proj = geoOrthographic().scale(size / 2 - 4).translate([size / 2, size / 2]).clipAngle(90);
    const path = geoPath(proj, ctx);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Theme colours are read once, and again only when the theme changes, not on every frame.
    let colors = { accent: '', accent2: '', line: '' };
    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      colors = {
        accent: css.getPropertyValue('--accent').trim(),
        accent2: css.getPropertyValue('--accent-2').trim(),
        line: css.getPropertyValue('--line').trim(),
      };
    };
    readColors();

    let lon = -10;
    let last = 0;
    const draw = () => {
      const { accent, accent2, line } = colors;
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
    };

    // Only animate while the globe is on screen and the tab is visible.
    let raf = 0;
    let visible = true;
    const loop = (t: number) => {
      // Same rotation speed whatever the screen's refresh rate.
      const dt = last ? Math.min(t - last, 100) : 16;
      last = t;
      lon += 0.0075 * dt;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduce || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    const mo = new MutationObserver(() => {
      readColors();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    draw();
    start();
    return () => {
      stop();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} className="max-w-full" aria-hidden />;
}
