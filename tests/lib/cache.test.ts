import { describe, it, expect, beforeEach } from 'vitest';
import { readCache, writeCache } from '../../src/lib/cache';
import { rmSync } from 'node:fs';

const DIR = '.cache-test';
beforeEach(() => { try { rmSync(DIR, { recursive: true, force: true }); } catch {} });

describe('cache', () => {
  it('returns null when no cache exists', () => {
    expect(readCache('feed', DIR)).toBeNull();
  });
  it('round-trips written data', () => {
    writeCache('feed', [{ a: 1 }], DIR);
    expect(readCache('feed', DIR)).toEqual([{ a: 1 }]);
  });
});
