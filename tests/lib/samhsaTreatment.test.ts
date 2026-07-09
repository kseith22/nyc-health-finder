import { describe, it, expect } from 'vitest';
import { fetchSamhsaTreatment } from '../../src/lib/adapters/samhsaTreatment';

const rows = [
  {
    name1: 'Acme Behavioral Health', name2: 'Outpatient Program',
    street1: '1 Main St', street2: '', city: 'Brooklyn', state: 'NY', zip: '11201',
    phone: '718-555-0100', website: 'http://acme.org',
    latitude: '40.69', longitude: '-73.99', typeFacility: 'MH',
  },
  {
    name1: 'Recovery Center', street1: '2 Oak Ave', city: 'Queens', state: 'NY', zip: '11375',
    phone: '718-555-0200', latitude: '40.72', longitude: '-73.85', typeFacility: 'SA',
  },
];

// One page of results (totalPages: 1)
const fakeFetch = async () =>
  ({ ok: true, json: async () => ({ page: 1, totalPages: 1, recordCount: 2, rows }) }) as any;

describe('SAMHSA treatment adapter', () => {
  it('maps MH facility to Mental Health with parsed coords and borough from zip', async () => {
    const out = await fetchSamhsaTreatment({ fetchImpl: fakeFetch });
    const mh = out.find((r) => r.title === 'Acme Behavioral Health')!;
    expect(mh.categories).toEqual(['Mental Health']);
    expect(mh.borough).toBe('Brooklyn');
    expect(mh.coordinates).toEqual({ lat: 40.69, lng: -73.99 });
    expect(mh.organization).toBe('Outpatient Program');
    expect(mh.source).toBe('samhsa');
  });
  it('maps SA facility to Harm Reduction & Recovery', async () => {
    const out = await fetchSamhsaTreatment({ fetchImpl: fakeFetch });
    const sa = out.find((r) => r.title === 'Recovery Center')!;
    expect(sa.categories).toEqual(['Harm Reduction & Recovery']);
    expect(sa.borough).toBe('Queens');
  });
});
