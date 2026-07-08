import { describe, it, expect } from 'vitest';
import { fetchNycOpenData } from '../../src/lib/adapters/nycOpenData';

const fakeRows = [
  {
    facility_name: 'Sunset Park Health Center',
    borough: 'Brooklyn', zipcode: '11220',
    address: '514 49th St', phone: '718-555-0100',
    latitude: '40.645', longitude: '-74.010',
  },
];

const fakeFetch = async () =>
  ({ ok: true, json: async () => fakeRows }) as any;

describe('nyc open data adapter', () => {
  it('normalizes rows into Resource[]', async () => {
    const out = await fetchNycOpenData(
      [{ dataset: 'abcd-1234', category: 'Vaccines & Screenings',
         map: { title: 'facility_name', address: 'address', borough: 'borough',
                zip: 'zipcode', phone: 'phone', lat: 'latitude', lng: 'longitude' } }],
      { appToken: 't', fetchImpl: fakeFetch },
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Sunset Park Health Center');
    expect(out[0].borough).toBe('Brooklyn');
    expect(out[0].coordinates).toEqual({ lat: 40.645, lng: -74.01 });
    expect(out[0].source).toBe('nyc-open-data:abcd-1234');
    expect(out[0].categories).toEqual(['Vaccines & Screenings']);
  });
  it('skips rows missing a title', async () => {
    const ff = async () => ({ ok: true, json: async () => [{ address: 'x' }] }) as any;
    const out = await fetchNycOpenData(
      [{ dataset: 'd', category: 'Food & Nutrition',
         map: { title: 'facility_name' } }],
      { appToken: 't', fetchImpl: ff });
    expect(out).toHaveLength(0);
  });
});
