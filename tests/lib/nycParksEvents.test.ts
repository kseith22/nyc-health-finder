import { describe, it, expect } from 'vitest';
import { fetchNycParksEvents } from '../../src/lib/adapters/nycParksEvents';

const rows = [
  { title: 'Free Yoga in Prospect Park', description: 'All levels fitness',
    startdate: '2026-07-12', starttime: '10:00 AM',
    location: 'Prospect Park', coordinates: '40.6602,-73.9690', link: 'https://x' },
  { title: 'Jazz Concert', description: 'music', startdate: '2026-07-13',
    location: 'Central Park' },
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
    expect(out[0].source).toBe('nyc-parks');
  });
});
