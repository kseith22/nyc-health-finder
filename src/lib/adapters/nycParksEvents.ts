import type { HealthEvent } from '../types';
import { slugify } from '../normalize';

const FEED = 'https://www.nycgovparks.org/xml/events_300_rss.json';
const HEALTH_KEYWORDS =
  /(yoga|fitness|walk|run|wellness|health|nutrition|mindful|zumba|exercise|tai chi|meditation|shape up)/i;

export interface ParksOpts { fetchImpl?: typeof fetch; feedUrl?: string; }

function parseCoords(s?: string) {
  if (!s) return undefined;
  const [lat, lng] = s.split(',').map((n) => Number(n.trim()));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

export async function fetchNycParksEvents(opts: ParksOpts = {}): Promise<HealthEvent[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(opts.feedUrl ?? FEED);
  if (!res.ok) throw new Error(`NYC Parks feed HTTP ${res.status}`);
  const rows: Record<string, any>[] = await res.json();

  return rows
    .filter((r) => HEALTH_KEYWORDS.test(`${r.title} ${r.description ?? ''}`))
    .map((r) => {
      const start = r.starttime
        ? new Date(`${r.startdate} ${r.starttime}`).toISOString()
        : new Date(r.startdate).toISOString();
      return {
        id: `parks-${slugify(r.title)}`,
        kind: 'event',
        title: r.title,
        description: r.description ?? r.title,
        categories: ['Fitness & Wellness'],
        address: r.location,
        borough: 'Citywide/Online',
        coordinates: parseCoords(r.coordinates),
        website: r.link,
        costNote: 'Free',
        whoItsFor: [],
        languagesOffered: [],
        source: 'nyc-parks',
        lastUpdated: new Date().toISOString().slice(0, 10),
        start,
        online: false,
      } as HealthEvent;
    });
}
