import { describe, it, expect } from 'vitest';
import { fetchNycParksEvents } from '../../src/lib/adapters/nycParksEvents';

// Shape mirrors the Socrata w3wp-dpdi dataset (nested link.url, ISO-ish startdate, "h:mm am" time).
const rows = [
  { title: 'Free Yoga in Prospect Park', description: 'All levels fitness', guid: '1',
    startdate: '2026-07-12T00:00:00.000', starttime: '10:00 am',
    location: 'Prospect Park', coordinates: '40.6602, -73.9690', link: { url: 'https://x' } },
  { title: 'Jazz Concert', description: 'music', guid: '2',
    startdate: '2026-07-13T00:00:00.000', location: 'Central Park' },
];
const fakeFetch = async () => ({ ok: true, json: async () => rows }) as any;

describe('nyc parks events adapter', () => {
  it('keeps only health/wellness events and maps them', async () => {
    const out = await fetchNycParksEvents({ fetchImpl: fakeFetch });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('event');
    expect(out[0].title).toBe('Free Yoga in Prospect Park');
    expect(out[0].categories).toEqual(['Fitness & Wellness']);
    expect(out[0].coordinates).toEqual({ lat: 40.6602, lng: -73.969 });
    expect(out[0].website).toBe('https://x'); // unwrapped from nested link.url
    expect(out[0].source).toBe('nyc-parks');
  });
});
