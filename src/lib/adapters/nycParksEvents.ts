import type { HealthEvent } from '../types';
import { slugify } from '../normalize';
import { USER_AGENT } from '../userAgent';

// NYC Parks upcoming events. Sourced via NYC Open Data (Socrata dataset w3wp-dpdi,
// "NYC Parks Public Events – Upcoming 14 Days") rather than the nycgovparks.org RSS
// feed, because that host blocks CI/datacenter egress while Socrata is reachable.
const FEED = 'https://data.cityofnewyork.us/resource/w3wp-dpdi.json?$limit=2000';
const HEALTH_KEYWORDS =
  /(yoga|fitness|walk|run|wellness|health|nutrition|mindful|zumba|exercise|tai chi|meditation|shape up|aerobic|dance|swim)/i;

export interface ParksOpts { fetchImpl?: typeof fetch; feedUrl?: string; }

function parseCoords(s?: string) {
  if (!s) return undefined;
  const [lat, lng] = s.split(',').map((n) => Number(n.trim()));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

/** Combine Socrata date ("2026-07-08T00:00:00.000") + time ("7:00 am") into ISO, or undefined. */
function toIso(startdate?: string, starttime?: string): string | undefined {
  if (!startdate) return undefined;
  const datePart = startdate.slice(0, 10);
  const d = starttime ? new Date(`${datePart} ${starttime}`) : new Date(datePart);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function fetchNycParksEvents(opts: ParksOpts = {}): Promise<HealthEvent[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(opts.feedUrl ?? FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`NYC Parks feed HTTP ${res.status}`);
  const rows: Record<string, any>[] = await res.json();

  const out: HealthEvent[] = [];
  for (const r of rows) {
    if (!HEALTH_KEYWORDS.test(`${r.title ?? ''} ${r.description ?? ''} ${r.categories ?? ''}`)) continue;
    const start = toIso(r.startdate, r.starttime);
    if (!start) continue; // skip unparseable dates rather than throwing the whole batch
    const link = typeof r.link === 'object' ? r.link?.url : r.link;
    out.push({
      id: `parks-${slugify(r.title)}-${r.guid ?? ''}`,
      kind: 'event',
      title: r.title,
      description: r.description ?? r.title,
      categories: ['Fitness & Wellness'],
      address: r.location ?? r.parknames,
      borough: 'Citywide/Online',
      coordinates: parseCoords(r.coordinates),
      website: link,
      costNote: 'Free',
      whoItsFor: [],
      languagesOffered: [],
      source: 'nyc-parks',
      lastUpdated: new Date().toISOString().slice(0, 10),
      start,
      online: false,
    } as HealthEvent);
  }
  return out;
}
