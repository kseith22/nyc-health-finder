import { describe, it, expect } from 'vitest';
import { slugify, dedupeKey, toBorough, boroughFromZip } from '../../src/lib/normalize';

describe('normalize', () => {
  it('slugifies titles', () => {
    expect(slugify('The Door — Youth Clinic!')).toBe('the-door-youth-clinic');
  });
  it('dedupe key uses name + zip when present', () => {
    expect(dedupeKey({ title: 'The Door', zip: '10013' } as any))
      .toBe('the-door|10013');
  });
  it('distinguishes zip-less entries by address', () => {
    const a = dedupeKey({ title: 'Greenmarket', address: '1 Main St' } as any);
    const b = dedupeKey({ title: 'Greenmarket', address: '2 Oak Ave' } as any);
    expect(a).not.toBe(b);
  });
  it('maps borough codes/names to canonical borough', () => {
    expect(toBorough('MN')).toBe('Manhattan');
    expect(toBorough('brooklyn')).toBe('Brooklyn');
    expect(toBorough('')).toBe('Citywide/Online');
  });
  it('derives NYC borough from zip code', () => {
    expect(boroughFromZip('10013')).toBe('Manhattan');
    expect(boroughFromZip('10301')).toBe('Staten Island');
    expect(boroughFromZip('10451')).toBe('Bronx');
    expect(boroughFromZip('11201')).toBe('Brooklyn');
    expect(boroughFromZip('11375')).toBe('Queens');
    expect(boroughFromZip('07030')).toBe('Citywide/Online'); // non-NYC
    expect(boroughFromZip(undefined)).toBe('Citywide/Online');
  });
});
