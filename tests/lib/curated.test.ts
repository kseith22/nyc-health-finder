import { describe, it, expect } from 'vitest';
import { mapCuratedResource, mapCuratedEvent } from '../../src/lib/adapters/curated';

const rawResource = {
  id: 'the-door',
  data: {
    title: 'The Door', description: 'desc', categories: ['Mental Health'],
    borough: 'Manhattan', whoItsFor: ['youth'], languagesOffered: ['English'],
    lastUpdated: '2026-07-07',
  },
};

describe('curated adapter', () => {
  it('maps a resource with id, kind, source', () => {
    const r = mapCuratedResource(rawResource as any);
    expect(r.id).toBe('the-door');
    expect(r.kind).toBe('resource');
    expect(r.source).toBe('curated');
    expect(r.categories).toEqual(['Mental Health']);
  });
  it('maps an event with kind=event and start', () => {
    const e = mapCuratedEvent({
      id: 'bp', data: { ...rawResource.data, start: '2026-07-08T18:00:00-04:00', online: false },
    } as any);
    expect(e.kind).toBe('event');
    expect(e.start).toBe('2026-07-08T18:00:00-04:00');
  });
});
