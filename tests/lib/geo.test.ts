import { describe, it, expect } from 'vitest';
import { haversineMiles, sortByDistance } from '../../src/lib/geo';
import type { Resource } from '../../src/lib/types';

const mk = (id: string, lat?: number, lng?: number): Resource => ({
  id, kind: 'resource', title: id, description: '', categories: ['Mental Health'],
  borough: 'Manhattan', whoItsFor: [], languagesOffered: [], source: 'curated',
  lastUpdated: '2026-07-07', coordinates: lat != null ? { lat, lng: lng! } : undefined,
});

describe('geo', () => {
  it('computes haversine distance (~ miles)', () => {
    // Times Square to Prospect Park ~ 5.5 miles
    const d = haversineMiles({ lat: 40.7580, lng: -73.9855 }, { lat: 40.6602, lng: -73.9690 });
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(8);
  });
  it('sorts entries with coords by nearest, coordless last', () => {
    const origin = { lat: 40.7580, lng: -73.9855 };
    const list = [mk('far', 40.5, -74.2), mk('near', 40.76, -73.98), mk('none')];
    expect(sortByDistance(list, origin).map((e) => e.id)).toEqual(['near', 'far', 'none']);
  });
});
