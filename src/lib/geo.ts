import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';

/**
 * Keeps the main landmass plus nearby islands, dropping far-flung territory
 * (e.g. French Guiana for France, Alaska/Hawaii for the US) so zooming and
 * silhouettes focus on the part people recognise.
 */
export function mainland(f: Feature<Geometry>): Feature<Geometry> {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const polys = (f.geometry as MultiPolygon).coordinates.map((coordinates) => {
    const p: Polygon = { type: 'Polygon', coordinates };
    return { coordinates, area: geoArea(p), centroid: geoCentroid(p) };
  });
  const biggest = polys.reduce((a, b) => (b.area > a.area ? b : a));
  const keep = polys.filter((p) => geoDistance(p.centroid, biggest.centroid) < 0.45);
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.coordinates) } };
}
