import { describe, it, expect } from 'vitest';
import { mergeEntries } from '../../src/lib/ingest';
import type { Resource } from '../../src/lib/types';

const base: Resource = {
  id: 'a', kind: 'resource', title: 'The Door', description: 'd',
  categories: ['Mental Health'], borough: 'Manhattan', zip: '10013',
  whoItsFor: [], languagesOffered: [], source: 'curated', lastUpdated: '2026-07-07',
};

describe('mergeEntries', () => {
  it('dedupes by name+zip, curated wins over feed', () => {
    const feed = { ...base, id: 'b', source: 'nyc-open-data:x', description: 'feed' };
    const out = mergeEntries([[base], [feed]]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('curated');
  });
  it('keeps distinct entries', () => {
    const other = { ...base, id: 'c', title: 'Other', zip: '10001' };
    const out = mergeEntries([[base], [other]]);
    expect(out).toHaveLength(2);
  });
});
