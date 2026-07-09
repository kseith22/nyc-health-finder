import { describe, it, expect } from 'vitest';
import { slugify, dedupeKey, toBorough } from '../../src/lib/normalize';

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
});
