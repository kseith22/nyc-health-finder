import type { Entry, Resource, HealthEvent } from './types';
import { dedupeKey } from './normalize';
import { fetchNycOpenData, type SocrataSource } from './adapters/nycOpenData';
import { fetchNycParksEvents } from './adapters/nycParksEvents';
import { readCache, writeCache } from './cache';

/** Merge many entry lists; earlier lists win on dedupe collisions (curated first). */
export function mergeEntries(lists: Entry[][]): Entry[] {
  const seen = new Map<string, Entry>();
  for (const list of lists) {
    for (const e of list) {
      const key = dedupeKey(e);
      if (!seen.has(key)) seen.set(key, e);
    }
  }
  return [...seen.values()];
}

/** Fetch one feed with cache fallback; never throws. */
async function safeFeed<T>(name: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    const data = await fn();
    if (data.length) writeCache(name, data);
    return data;
  } catch (err) {
    console.warn(`[ingest] ${name} failed, using cache:`, (err as Error).message);
    return (readCache<T[]>(name) ?? []);
  }
}

export interface IngestInput {
  curatedResources: Resource[];
  curatedEvents: HealthEvent[];
  socrataSources: SocrataSource[];
  appToken?: string;
}

export async function ingestAll(input: IngestInput): Promise<{ resources: Resource[]; events: HealthEvent[]; }> {
  const openData = await safeFeed('nyc-open-data', () =>
    fetchNycOpenData(input.socrataSources, { appToken: input.appToken }));
  const parks = await safeFeed('nyc-parks', () => fetchNycParksEvents());

  const resources = mergeEntries([input.curatedResources, openData]) as Resource[];
  const events = mergeEntries([input.curatedEvents, parks]) as HealthEvent[];
  return { resources, events };
}
