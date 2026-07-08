import Fuse from 'fuse.js';
import type { Entry, Category, Borough, WhoItsFor } from './types';

export interface Filters {
  categories: Category[];
  boroughs: Borough[];
  whoItsFor: WhoItsFor[];
  q: string;
}

export function applyFilters<T extends Entry>(data: T[], f: Filters): T[] {
  let out = data.filter((e) => {
    if (f.categories.length && !e.categories.some((c) => f.categories.includes(c))) return false;
    if (f.boroughs.length && !f.boroughs.includes(e.borough)) return false;
    if (f.whoItsFor.length && !e.whoItsFor.some((w) => f.whoItsFor.includes(w))) return false;
    return true;
  });
  const q = f.q.trim();
  if (q) {
    const fuse = new Fuse(out, {
      keys: ['title', 'organization', 'description', 'neighborhood'],
      threshold: 0.4, ignoreLocation: true,
    });
    out = fuse.search(q).map((r) => r.item);
  }
  return out;
}

/** Parse/serialize filters to URL search params (shareable views). */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.categories.length) p.set('category', f.categories.join(','));
  if (f.boroughs.length) p.set('borough', f.boroughs.join(','));
  if (f.whoItsFor.length) p.set('for', f.whoItsFor.join(','));
  return p;
}

export function paramsToFilters(p: URLSearchParams): Filters {
  const split = (k: string) => (p.get(k) ? p.get(k)!.split(',') : []);
  return {
    q: p.get('q') ?? '',
    categories: split('category') as Category[],
    boroughs: split('borough') as Borough[],
    whoItsFor: split('for') as WhoItsFor[],
  };
}
