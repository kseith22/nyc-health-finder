import { describe, it, expect } from 'vitest';
import { CATEGORIES, BOROUGHS, WHO_ITS_FOR, isCategory } from '../../src/lib/types';

describe('vocabularies', () => {
  it('has 12 categories', () => {
    expect(CATEGORIES).toHaveLength(12);
    expect(CATEGORIES).toContain('Mental Health');
  });
  it('has 6 borough options including Citywide/Online', () => {
    expect(BOROUGHS).toContain('Citywide/Online');
    expect(BOROUGHS).toHaveLength(6);
  });
  it('isCategory validates membership', () => {
    expect(isCategory('Mental Health')).toBe(true);
    expect(isCategory('Astrology')).toBe(false);
  });
  it('exposes who-its-for tags', () => {
    expect(WHO_ITS_FOR).toContain('youth');
  });
});
