import type { Borough } from './types';

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function dedupeKey(
  e: { title: string; zip?: string; address?: string; coordinates?: { lat: number; lng: number } },
): string {
  const loc = e.zip
    || e.address
    || (e.coordinates ? `${e.coordinates.lat.toFixed(4)},${e.coordinates.lng.toFixed(4)}` : '');
  return `${slugify(e.title)}|${loc}`;
}

const BOROUGH_MAP: Record<string, Borough> = {
  mn: 'Manhattan', manhattan: 'Manhattan', 'new york': 'Manhattan',
  bk: 'Brooklyn', brooklyn: 'Brooklyn', kings: 'Brooklyn',
  qn: 'Queens', queens: 'Queens',
  bx: 'Bronx', bronx: 'Bronx',
  si: 'Staten Island', 'staten island': 'Staten Island', richmond: 'Staten Island',
};

export function toBorough(raw: string | undefined | null): Borough {
  if (!raw) return 'Citywide/Online';
  return BOROUGH_MAP[raw.trim().toLowerCase()] ?? 'Citywide/Online';
}
