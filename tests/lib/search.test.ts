import { describe, it, expect } from 'vitest';
import { applyFilters, type Filters } from '../../src/lib/search';
import type { Resource } from '../../src/lib/types';

const mk = (o: Partial<Resource>): Resource => ({
  id: o.id!, kind: 'resource', title: o.title ?? 't', description: o.description ?? '',
  categories: o.categories ?? ['Mental Health'], borough: o.borough ?? 'Manhattan',
  whoItsFor: o.whoItsFor ?? [], languagesOffered: [], source: 'curated',
  lastUpdated: '2026-07-07', ...o,
});

const data: Resource[] = [
  mk({ id: '1', title: 'Youth Clinic', categories: ['Mental Health'], borough: 'Brooklyn', whoItsFor: ['youth'] }),
  mk({ id: '2', title: 'Food Pantry', categories: ['Food & Nutrition'], borough: 'Bronx' }),
];

describe('applyFilters', () => {
  it('filters by category', () => {
    const f: Filters = { categories: ['Food & Nutrition'], boroughs: [], whoItsFor: [], q: '' };
    expect(applyFilters(data, f).map((d) => d.id)).toEqual(['2']);
  });
  it('filters by borough AND who-its-for', () => {
    const f: Filters = { categories: [], boroughs: ['Brooklyn'], whoItsFor: ['youth'], q: '' };
    expect(applyFilters(data, f).map((d) => d.id)).toEqual(['1']);
  });
  it('keyword search matches title', () => {
    const f: Filters = { categories: [], boroughs: [], whoItsFor: [], q: 'pantry' };
    expect(applyFilters(data, f).map((d) => d.id)).toEqual(['2']);
  });
  it('empty filters return all', () => {
    const f: Filters = { categories: [], boroughs: [], whoItsFor: [], q: '' };
    expect(applyFilters(data, f)).toHaveLength(2);
  });
});
