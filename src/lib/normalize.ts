import type { Borough, Entry } from './types';

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function dedupeKey(e: Pick<Entry, 'title'> & { zip?: string }): string {
  return `${slugify(e.title)}|${e.zip ?? ''}`;
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
