import { describe, it, expect } from 'vitest';
import { fetchHrsaHealthCenters } from '../../src/lib/adapters/hrsaHealthCenters';

const fakeArcgis = {
  features: [
    {
      attributes: {
        SITE_NM: 'Comprehensive Family Care Center',
        SITE_ADDRESS: '1621 Eastchester Rd',
        SITE_CITY: 'Bronx',
        SITE_ZIP_CD: '10461-2604',
        SITE_PHONE_NUM: '718-405-8040',
        SITE_URL: 'www.montefiore.org',
        CMN_STATE_COUNTY_FIPS_CD: '36005',
      },
      geometry: { x: -73.84547833, y: 40.84523579 },
    },
    { attributes: { SITE_NM: '' }, geometry: { x: 0, y: 0 } }, // skipped: no title
  ],
};

const fakeFetch = async () => ({ ok: true, json: async () => fakeArcgis }) as any;

describe('HRSA health centers adapter', () => {
  it('normalizes ArcGIS features into Resource[]', async () => {
    const out = await fetchHrsaHealthCenters({ fetchImpl: fakeFetch });
    expect(out).toHaveLength(1);
    const r = out[0];
    expect(r.title).toBe('Comprehensive Family Care Center');
    expect(r.borough).toBe('Bronx');
    expect(r.zip).toBe('10461'); // trimmed to 5
    expect(r.coordinates).toEqual({ lat: 40.84523579, lng: -73.84547833 });
    expect(r.website).toBe('https://www.montefiore.org'); // https prepended
    expect(r.source).toBe('hrsa');
    expect(r.categories).toEqual(
      expect.arrayContaining(['Chronic Disease Support', 'Vaccines & Screenings', 'Maternal & Family Health']),
    );
  });
});
