import type { Resource, Category } from '../types';
import { toBorough, slugify } from '../normalize';
import { USER_AGENT } from '../userAgent';

export interface SocrataSource {
  dataset: string;                 // Socrata dataset id, e.g. 'abcd-1234'
  category: Category;
  map: {
    title: string; address?: string; borough?: string; zip?: string;
    phone?: string; website?: string; hours?: string; lat?: string; lng?: string;
    neighborhood?: string; organization?: string; description?: string;
  };
}

export interface SocrataOpts {
  appToken?: string;
  fetchImpl?: typeof fetch;
  limit?: number;
}

const BASE = 'https://data.cityofnewyork.us/resource';

function pick(row: Record<string, any>, key?: string): string | undefined {
  if (!key) return undefined;
  const v = row[key];
  return v == null || v === '' ? undefined : String(v);
}

export async function fetchNycOpenData(
  sources: SocrataSource[], opts: SocrataOpts = {},
): Promise<Resource[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const limit = opts.limit ?? 1000;
  const results: Resource[] = [];

  for (const src of sources) {
    const url = `${BASE}/${src.dataset}.json?$limit=${limit}`;
    const res = await doFetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        ...(opts.appToken ? { 'X-App-Token': opts.appToken } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Socrata ${src.dataset} HTTP ${res.status}`);
    const rows: Record<string, any>[] = await res.json();

    for (const row of rows) {
      const title = pick(row, src.map.title);
      if (!title) continue;
      const lat = pick(row, src.map.lat);
      const lng = pick(row, src.map.lng);
      results.push({
        id: `${src.dataset}-${slugify(title)}`,
        kind: 'resource',
        title,
        organization: pick(row, src.map.organization),
        description: pick(row, src.map.description)
          ?? `${title} — sourced from NYC Open Data.`,
        categories: [src.category],
        address: pick(row, src.map.address),
        borough: toBorough(pick(row, src.map.borough)),
        neighborhood: pick(row, src.map.neighborhood),
        zip: pick(row, src.map.zip),
        coordinates: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
        phone: pick(row, src.map.phone),
        website: pick(row, src.map.website),
        hours: pick(row, src.map.hours),
        costNote: 'Free or low-cost — confirm with provider',
        whoItsFor: [],
        languagesOffered: [],
        source: `nyc-open-data:${src.dataset}`,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
    }
  }
  return results;
}
