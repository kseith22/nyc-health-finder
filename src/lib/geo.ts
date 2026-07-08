import type { Entry, Coordinates } from './types';

export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

export function sortByDistance<T extends Entry>(list: T[], origin: Coordinates): T[] {
  return [...list].sort((a, b) => {
    const da = a.coordinates ? haversineMiles(origin, a.coordinates) : Infinity;
    const db = b.coordinates ? haversineMiles(origin, b.coordinates) : Infinity;
    return da - db;
  });
}
