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

/** Derive an NYC borough from a ZIP code by prefix. Non-NYC ZIPs → Citywide/Online. */
export function boroughFromZip(zip: string | undefined | null): Borough {
  if (!zip) return 'Citywide/Online';
  const p = String(zip).trim().slice(0, 3);
  if (p === '100' || p === '101' || p === '102') return 'Manhattan';
  if (p === '103') return 'Staten Island';
  if (p === '104') return 'Bronx';
  if (p === '112') return 'Brooklyn';
  if (p === '110' || p === '111' || p === '113' || p === '114' || p === '116') return 'Queens';
  return 'Citywide/Online';
}
