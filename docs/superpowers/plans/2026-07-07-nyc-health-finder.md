# NYC Health Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build NYC Health Finder — a free, mobile-first Astro website where NYC residents find free public health resources and events, sourced from curated Markdown plus live NYC Open Data and NYC Parks feeds, kept current by a nightly rebuild.

**Architecture:** Static Astro site. All content (curated Markdown + API feeds) is normalized into one shared `Resource`/`Event` shape via an adapter pattern, merged and de-duplicated at build time, then rendered to static pages. Search, filters, map, and "Near me" run client-side over a pre-built JSON index, with filter state in the URL. A nightly GitHub Action re-ingests feeds and redeploys to Cloudflare Pages.

**Tech Stack:** Astro (TypeScript), Vitest (tests), Zod (schema validation via Astro content collections), Fuse.js (client-side search), Leaflet + OpenStreetMap (map), Cloudflare Pages (hosting), GitHub Actions (nightly rebuild).

**Reference spec:** `docs/superpowers/specs/2026-07-07-nyc-health-finder-design.md`

---

## File Structure

```
src/
  lib/
    types.ts              # Shared Resource / Event / normalized types + vocab constants
    normalize.ts          # Helpers to coerce raw records into Resource/Event, dedupe key
    adapters/
      curated.ts          # Adapter: read curated content collections -> Resource[]/Event[]
      nycOpenData.ts       # Adapter: NYC Open Data (Socrata) -> Resource[]
      nycParksEvents.ts    # Adapter: NYC Parks Events -> Event[]
    ingest.ts             # Fetch all adapters, merge, dedupe, cache fallback -> {resources, events}
    cache.ts              # Read/write last-good feed cache under .cache/
    search.ts             # Pure filter + search logic over Resource[]/Event[] (client-safe)
    geo.ts                # Haversine distance + sort-by-distance
  content/
    config.ts             # Astro content collections (resources, events) with Zod schemas
    resources/*.md         # Curated resource entries
    events/*.md            # Curated event entries
  data/
    index.ts              # Build-time: getAllResources()/getAllEvents() (memoized ingest)
  layouts/
    Base.astro            # HTML shell: nav, crisis link, footer + disclaimer, <slot/>
  components/
    Nav.astro
    Footer.astro
    CrisisBanner.astro
    ResourceCard.astro
    EventCard.astro
    CategoryTile.astro
    FilterBar.astro        # Filter controls (category/borough/who-its-for) + search box
    ResultsMap.astro       # Leaflet map container + island script
  pages/
    index.astro           # Home
    resources.astro        # Browse (search + filters + List<->Map)
    events.astro           # Events list
    categories/index.astro # Category index
    categories/[slug].astro# Category landing
    resource/[slug].astro  # Resource detail
    event/[slug].astro     # Event detail
    about.astro
  styles/
    tokens.css            # CSS variables (Warm+Clear palette, spacing, radius)
    global.css            # Base element styles, layout utilities
  scripts/
    resources-island.ts   # Client: read data JSON, wire search/filter/map/near-me, URL state
tests/
  lib/*.test.ts           # Vitest unit tests
.github/workflows/
  nightly.yml             # Nightly ingest + build + deploy
.env.example
astro.config.mjs
vitest.config.ts
```

**Data flow:** `content/*.md` + feeds → `lib/adapters/*` → `lib/ingest.ts` → `src/data/index.ts` (build-time) → pages render static HTML **and** emit `/data/resources.json` consumed by `scripts/resources-island.ts` for client-side search/filter/map.

---

## Task 1: Scaffold Astro project + Vitest

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro`

- [ ] **Step 1: Scaffold Astro (minimal, TypeScript strict)**

Run in project root (empty except `docs/`, `.gitignore`):
```bash
npm create astro@latest -- --template minimal --typescript strict --no-install --no-git --skip-houston .
```
If the CLI refuses a non-empty dir, scaffold in `./tmp-astro` and move files up, then delete `tmp-astro`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install fuse.js leaflet
npm install -D vitest @types/leaflet
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Add test + build scripts to package.json**

In `package.json` `"scripts"`, ensure:
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "ingest": "node --loader tsx scripts-cli/ingest.mjs"
}
```
(The `ingest` script is finalized in Task 20; leave it here now.)

- [ ] **Step 5: Verify dev server boots**

Run: `npm run dev`
Expected: Astro dev server starts and `http://localhost:4321` serves the default page. Stop it (Ctrl-C).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with Vitest"
```

---

## Task 2: Shared types & controlled vocabularies

**Files:**
- Create: `src/lib/types.ts`
- Test: `tests/lib/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/types.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/types.test.ts`
Expected: FAIL — cannot find module `src/lib/types`.

- [ ] **Step 3: Implement types & vocab**

Create `src/lib/types.ts`:
```ts
export const CATEGORIES = [
  'Mental Health',
  'Sexual & Reproductive Health',
  'Vaccines & Screenings',
  'Harm Reduction & Recovery',
  'Food & Nutrition',
  'Maternal & Family Health',
  'Chronic Disease Support',
  'Fitness & Wellness',
  'Insurance & Benefits Navigation',
  'Housing & Environmental Health',
  'Dental & Vision',
  'Immigrant Health',
] as const;

export const BOROUGHS = [
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
  'Citywide/Online',
] as const;

export const WHO_ITS_FOR = [
  'youth', 'seniors', 'LGBTQ+', 'immigrants', 'uninsured',
  'pregnant people', 'families', 'veterans', 'people who use drugs',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Borough = (typeof BOROUGHS)[number];
export type WhoItsFor = (typeof WHO_ITS_FOR)[number];

export interface Coordinates { lat: number; lng: number; }

export interface Resource {
  id: string;              // stable slug (dedupe key basis)
  kind: 'resource';
  title: string;
  organization?: string;
  description: string;
  categories: Category[];
  address?: string;
  borough: Borough;
  neighborhood?: string;
  zip?: string;
  coordinates?: Coordinates;
  phone?: string;
  website?: string;
  email?: string;
  hours?: string;
  costNote?: string;
  whoItsFor: WhoItsFor[];
  languagesOffered: string[];
  howToAccess?: 'walk-in' | 'appointment' | 'referral';
  source: string;          // 'curated' | 'nyc-open-data:<dataset>' | 'nyc-parks'
  lastUpdated: string;     // ISO date
}

export interface HealthEvent extends Omit<Resource, 'kind'> {
  kind: 'event';
  start: string;           // ISO datetime
  end?: string;
  online: boolean;
  registrationRequired?: boolean;
  registrationUrl?: string;
}

export type Entry = Resource | HealthEvent;

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts tests/lib/types.test.ts
git commit -m "feat: shared types and controlled vocabularies"
```

---

## Task 3: Content collection schemas (curated Markdown)

**Files:**
- Create: `src/content/config.ts`, `src/content/resources/the-door.md`, `src/content/events/bp-screening.md`

- [ ] **Step 1: Define Zod schemas mirroring the vocab**

Create `src/content/config.ts`:
```ts
import { defineCollection, z } from 'astro:content';
import { CATEGORIES, BOROUGHS, WHO_ITS_FOR } from '../lib/types';

const coordinates = z.object({ lat: z.number(), lng: z.number() });

const base = {
  title: z.string(),
  organization: z.string().optional(),
  description: z.string(),
  categories: z.array(z.enum(CATEGORIES)).min(1),
  address: z.string().optional(),
  borough: z.enum(BOROUGHS),
  neighborhood: z.string().optional(),
  zip: z.string().optional(),
  coordinates: coordinates.optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  hours: z.string().optional(),
  costNote: z.string().optional(),
  whoItsFor: z.array(z.enum(WHO_ITS_FOR)).default([]),
  languagesOffered: z.array(z.string()).default([]),
  howToAccess: z.enum(['walk-in', 'appointment', 'referral']).optional(),
  lastUpdated: z.string(),
};

const resources = defineCollection({ type: 'content', schema: z.object(base) });

const events = defineCollection({
  type: 'content',
  schema: z.object({
    ...base,
    start: z.string(),
    end: z.string().optional(),
    online: z.boolean().default(false),
    registrationRequired: z.boolean().optional(),
    registrationUrl: z.string().url().optional(),
  }),
});

export const collections = { resources, events };
```

- [ ] **Step 2: Add one curated resource**

Create `src/content/resources/the-door.md`:
```md
---
title: "The Door — Health Services for Youth"
organization: "The Door"
description: "Free, confidential medical and mental health care for young people ages 12–24, including primary care, counseling, and sexual health services. No insurance or ID required."
categories: ["Mental Health", "Sexual & Reproductive Health"]
address: "121 Avenue of the Americas"
borough: "Manhattan"
neighborhood: "SoHo"
zip: "10013"
coordinates: { lat: 40.7239, lng: -74.0045 }
phone: "212-941-9090"
website: "https://door.org"
hours: "Mon–Fri 9am–7pm"
costNote: "Free — no ID or insurance required"
whoItsFor: ["youth", "uninsured", "LGBTQ+"]
languagesOffered: ["English", "Spanish"]
howToAccess: "walk-in"
lastUpdated: "2026-07-07"
---
The Door provides comprehensive youth services under one roof.
```

- [ ] **Step 3: Add one curated event**

Create `src/content/events/bp-screening.md`:
```md
---
title: "Free Blood Pressure Screening"
organization: "NYC Health + Hospitals"
description: "Walk-in blood pressure checks with a nurse. No appointment or insurance needed."
categories: ["Chronic Disease Support"]
address: "10 Grand Army Plaza"
borough: "Brooklyn"
coordinates: { lat: 40.6725, lng: -73.9686 }
costNote: "Free — no appointment"
whoItsFor: ["seniors", "uninsured"]
languagesOffered: ["English"]
start: "2026-07-08T18:00:00-04:00"
online: false
lastUpdated: "2026-07-07"
---
Drop by the Central Library branch for a quick screening.
```

- [ ] **Step 4: Verify schemas validate on build**

Run: `npm run build`
Expected: build succeeds; no Zod validation errors for the two entries. (Home page still default — that's fine.)

- [ ] **Step 5: Commit**

```bash
git add src/content
git commit -m "feat: content collection schemas + seed curated entries"
```

---

## Task 4: Curated adapter (collections -> normalized Entry[])

**Files:**
- Create: `src/lib/adapters/curated.ts`
- Test: `tests/lib/curated.test.ts`

- [ ] **Step 1: Write the failing test** (adapter is a pure mapper over collection entries)

Create `tests/lib/curated.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapCuratedResource, mapCuratedEvent } from '../../src/lib/adapters/curated';

const rawResource = {
  slug: 'the-door',
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
      slug: 'bp', data: { ...rawResource.data, start: '2026-07-08T18:00:00-04:00', online: false },
    } as any);
    expect(e.kind).toBe('event');
    expect(e.start).toBe('2026-07-08T18:00:00-04:00');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/curated.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/adapters/curated.ts`:
```ts
import type { CollectionEntry } from 'astro:content';
import type { Resource, HealthEvent } from '../types';

export function mapCuratedResource(entry: CollectionEntry<'resources'>): Resource {
  const d = entry.data;
  return {
    id: entry.slug,
    kind: 'resource',
    title: d.title,
    organization: d.organization,
    description: d.description,
    categories: d.categories,
    address: d.address,
    borough: d.borough,
    neighborhood: d.neighborhood,
    zip: d.zip,
    coordinates: d.coordinates,
    phone: d.phone,
    website: d.website,
    email: d.email,
    hours: d.hours,
    costNote: d.costNote,
    whoItsFor: d.whoItsFor,
    languagesOffered: d.languagesOffered,
    howToAccess: d.howToAccess,
    source: 'curated',
    lastUpdated: d.lastUpdated,
  };
}

export function mapCuratedEvent(entry: CollectionEntry<'events'>): HealthEvent {
  const base = mapCuratedResource({ ...entry, collection: 'resources' } as any);
  const d = entry.data;
  return {
    ...base,
    kind: 'event',
    start: d.start,
    end: d.end,
    online: d.online ?? false,
    registrationRequired: d.registrationRequired,
    registrationUrl: d.registrationUrl,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/curated.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adapters/curated.ts tests/lib/curated.test.ts
git commit -m "feat: curated content adapter"
```

---

## Task 5: Normalize helpers + dedupe key

**Files:**
- Create: `src/lib/normalize.ts`
- Test: `tests/lib/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/normalize.test.ts`:
```ts
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
  it('maps borough codes/names to canonical borough', () => {
    expect(toBorough('MN')).toBe('Manhattan');
    expect(toBorough('brooklyn')).toBe('Brooklyn');
    expect(toBorough('')).toBe('Citywide/Online');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers**

Create `src/lib/normalize.ts`:
```ts
import type { Borough, Entry } from './types';

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function dedupeKey(e: Pick<Entry, 'title'> & { zip?: string }): string {
  return `${slugify(e.title)}|${e.zip ?? ''}`;
}

const BOROUGH_MAP: Record<string, Borough> = {
  mn: 'Manhattan', manhattan: 'Manhattan', 'new york': 'Manhattan',
  bk: 'Brooklyn', brooklyn: 'Brooklyn', kings: 'Brooklyn',
  qn: 'Queens', queens: 'Queens',
  bx: 'Bronx', bronx: 'Bronx',
  si: 'Staten Island', 'staten island': 'Staten Island', richmond: 'Staten Island',
};

export function toBorough(raw: string | undefined | null): Borough {
  if (!raw) return 'Citywide/Online';
  return BOROUGH_MAP[raw.trim().toLowerCase()] ?? 'Citywide/Online';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/normalize.ts tests/lib/normalize.test.ts
git commit -m "feat: normalize helpers and dedupe key"
```

---

## Task 6: NYC Open Data (Socrata) adapter

**Files:**
- Create: `src/lib/adapters/nycOpenData.ts`
- Test: `tests/lib/nycOpenData.test.ts`

**Note:** The adapter takes a `fetchImpl` param so tests inject a fake. Dataset IDs + field mapping are provided as a config array; the exact dataset IDs are confirmed live in Task 19.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/nycOpenData.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { fetchNycOpenData } from '../../src/lib/adapters/nycOpenData';

const fakeRows = [
  {
    facility_name: 'Sunset Park Health Center',
    borough: 'Brooklyn', zipcode: '11220',
    address: '514 49th St', phone: '718-555-0100',
    latitude: '40.645', longitude: '-74.010',
  },
];

const fakeFetch = async () =>
  ({ ok: true, json: async () => fakeRows }) as any;

describe('nyc open data adapter', () => {
  it('normalizes rows into Resource[]', async () => {
    const out = await fetchNycOpenData(
      [{ dataset: 'abcd-1234', category: 'Vaccines & Screenings',
         map: { title: 'facility_name', address: 'address', borough: 'borough',
                zip: 'zipcode', phone: 'phone', lat: 'latitude', lng: 'longitude' } }],
      { appToken: 't', fetchImpl: fakeFetch },
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Sunset Park Health Center');
    expect(out[0].borough).toBe('Brooklyn');
    expect(out[0].coordinates).toEqual({ lat: 40.645, lng: -74.01 });
    expect(out[0].source).toBe('nyc-open-data:abcd-1234');
    expect(out[0].categories).toEqual(['Vaccines & Screenings']);
  });
  it('skips rows missing a title', async () => {
    const ff = async () => ({ ok: true, json: async () => [{ address: 'x' }] }) as any;
    const out = await fetchNycOpenData(
      [{ dataset: 'd', category: 'Food & Nutrition',
         map: { title: 'facility_name' } }],
      { appToken: 't', fetchImpl: ff });
    expect(out).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/nycOpenData.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/adapters/nycOpenData.ts`:
```ts
import type { Resource, Category } from '../types';
import { toBorough, slugify } from '../normalize';

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
      headers: opts.appToken ? { 'X-App-Token': opts.appToken } : {},
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/nycOpenData.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adapters/nycOpenData.ts tests/lib/nycOpenData.test.ts
git commit -m "feat: NYC Open Data (Socrata) adapter"
```

---

## Task 7: NYC Parks Events adapter

**Files:**
- Create: `src/lib/adapters/nycParksEvents.ts`
- Test: `tests/lib/nycParksEvents.test.ts`

**Note:** NYC Parks publishes an events feed; this adapter maps its fields into `HealthEvent`, keeping only health/wellness-relevant events by a keyword filter. Endpoint + exact fields confirmed in Task 19.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/nycParksEvents.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { fetchNycParksEvents } from '../../src/lib/adapters/nycParksEvents';

const rows = [
  { title: 'Free Yoga in Prospect Park', description: 'All levels fitness',
    startdate: '2026-07-12', starttime: '10:00 AM',
    location: 'Prospect Park', coordinates: '40.6602,-73.9690', link: 'https://x' },
  { title: 'Jazz Concert', description: 'music', startdate: '2026-07-13',
    location: 'Central Park' },
];
const fakeFetch = async () => ({ ok: true, json: async () => rows }) as any;

describe('nyc parks events adapter', () => {
  it('keeps only health/wellness events and maps them', async () => {
    const out = await fetchNycParksEvents({ fetchImpl: fakeFetch });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('event');
    expect(out[0].title).toBe('Free Yoga in Prospect Park');
    expect(out[0].categories).toEqual(['Fitness & Wellness']);
    expect(out[0].coordinates).toEqual({ lat: 40.6602, lng: -73.969 });
    expect(out[0].source).toBe('nyc-parks');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/nycParksEvents.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/adapters/nycParksEvents.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/nycParksEvents.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adapters/nycParksEvents.ts tests/lib/nycParksEvents.test.ts
git commit -m "feat: NYC Parks Events adapter"
```

---

## Task 8: Cache (last-good feed fallback)

**Files:**
- Create: `src/lib/cache.ts`
- Test: `tests/lib/cache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/cache.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement cache**

Create `src/lib/cache.ts`:
```ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_DIR = '.cache';

export function writeCache(name: string, data: unknown, dir = DEFAULT_DIR): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(data), 'utf8');
}

export function readCache<T = unknown>(name: string, dir = DEFAULT_DIR): T | null {
  const path = join(dir, `${name}.json`);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')) as T; }
  catch { return null; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/cache.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache.ts tests/lib/cache.test.ts
git commit -m "feat: last-good feed cache"
```

---

## Task 9: Ingest — merge, dedupe, cache fallback

**Files:**
- Create: `src/lib/ingest.ts`
- Test: `tests/lib/ingest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/ingest.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/ingest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement merge + orchestrator**

Create `src/lib/ingest.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/ingest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest.ts tests/lib/ingest.test.ts
git commit -m "feat: ingest orchestrator with merge, dedupe, cache fallback"
```

---

## Task 10: Search + filter logic (client-safe, pure)

**Files:**
- Create: `src/lib/search.ts`
- Test: `tests/lib/search.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/search.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { applyFilters, type Filters } from '../../src/lib/search';
import type { Resource } from '../../src/lib/types';

const mk = (o: Partial<Resource>): Resource => ({
  id: o.id!, kind: 'resource', title: o.title ?? 't', description: o.description ?? '',
  categories: o.categories ?? ['Mental Health'], borough: o.borough ?? 'Manhattan',
  whoItsFor: o.whoItsFor ?? [], languagesOffered: [], source: 'curated',
  lastUpdated: '2026-07-07', ...o,
});

const data: Resource[] = [
  mk({ id: '1', title: 'Youth Clinic', categories: ['Mental Health'], borough: 'Brooklyn', whoItsFor: ['youth'] }),
  mk({ id: '2', title: 'Food Pantry', categories: ['Food & Nutrition'], borough: 'Bronx' }),
];

describe('applyFilters', () => {
  it('filters by category', () => {
    const f: Filters = { categories: ['Food & Nutrition'], boroughs: [], whoItsFor: [], q: '' };
    expect(applyFilters(data, f).map((d) => d.id)).toEqual(['2']);
  });
  it('filters by borough AND who-its-for', () => {
    const f: Filters = { categories: [], boroughs: ['Brooklyn'], whoItsFor: ['youth'], q: '' };
    expect(applyFilters(data, f).map((d) => d.id)).toEqual(['1']);
  });
  it('keyword search matches title', () => {
    const f: Filters = { categories: [], boroughs: [], whoItsFor: [], q: 'pantry' };
    expect(applyFilters(data, f).map((d) => d.id)).toEqual(['2']);
  });
  it('empty filters return all', () => {
    const f: Filters = { categories: [], boroughs: [], whoItsFor: [], q: '' };
    expect(applyFilters(data, f)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement filters + Fuse-backed keyword search**

Create `src/lib/search.ts`:
```ts
import Fuse from 'fuse.js';
import type { Entry, Category, Borough, WhoItsFor } from './types';

export interface Filters {
  categories: Category[];
  boroughs: Borough[];
  whoItsFor: WhoItsFor[];
  q: string;
}

export function applyFilters<T extends Entry>(data: T[], f: Filters): T[] {
  let out = data.filter((e) => {
    if (f.categories.length && !e.categories.some((c) => f.categories.includes(c))) return false;
    if (f.boroughs.length && !f.boroughs.includes(e.borough)) return false;
    if (f.whoItsFor.length && !e.whoItsFor.some((w) => f.whoItsFor.includes(w))) return false;
    return true;
  });
  const q = f.q.trim();
  if (q) {
    const fuse = new Fuse(out, {
      keys: ['title', 'organization', 'description', 'neighborhood'],
      threshold: 0.4, ignoreLocation: true,
    });
    out = fuse.search(q).map((r) => r.item);
  }
  return out;
}

/** Parse/serialize filters to URL search params (shareable views). */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.categories.length) p.set('category', f.categories.join(','));
  if (f.boroughs.length) p.set('borough', f.boroughs.join(','));
  if (f.whoItsFor.length) p.set('for', f.whoItsFor.join(','));
  return p;
}

export function paramsToFilters(p: URLSearchParams): Filters {
  const split = (k: string) => (p.get(k) ? p.get(k)!.split(',') : []);
  return {
    q: p.get('q') ?? '',
    categories: split('category') as Category[],
    boroughs: split('borough') as Borough[],
    whoItsFor: split('for') as WhoItsFor[],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/search.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts tests/lib/search.test.ts
git commit -m "feat: filter + keyword search + URL param (de)serialization"
```

---

## Task 11: Geo — distance + sort ("Near me")

**Files:**
- Create: `src/lib/geo.ts`
- Test: `tests/lib/geo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/geo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { haversineMiles, sortByDistance } from '../../src/lib/geo';
import type { Resource } from '../../src/lib/types';

const mk = (id: string, lat?: number, lng?: number): Resource => ({
  id, kind: 'resource', title: id, description: '', categories: ['Mental Health'],
  borough: 'Manhattan', whoItsFor: [], languagesOffered: [], source: 'curated',
  lastUpdated: '2026-07-07', coordinates: lat != null ? { lat, lng: lng! } : undefined,
});

describe('geo', () => {
  it('computes haversine distance (~ miles)', () => {
    // Times Square to Prospect Park ~ 5.5 miles
    const d = haversineMiles({ lat: 40.7580, lng: -73.9855 }, { lat: 40.6602, lng: -73.9690 });
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(8);
  });
  it('sorts entries with coords by nearest, coordless last', () => {
    const origin = { lat: 40.7580, lng: -73.9855 };
    const list = [mk('far', 40.5, -74.2), mk('near', 40.76, -73.98), mk('none')];
    expect(sortByDistance(list, origin).map((e) => e.id)).toEqual(['near', 'far', 'none']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/geo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement geo**

Create `src/lib/geo.ts`:
```ts
import type { Entry, Coordinates } from './types';

export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

export function sortByDistance<T extends Entry>(list: T[], origin: Coordinates): T[] {
  return [...list].sort((a, b) => {
    const da = a.coordinates ? haversineMiles(origin, a.coordinates) : Infinity;
    const db = b.coordinates ? haversineMiles(origin, b.coordinates) : Infinity;
    return da - db;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts tests/lib/geo.test.ts
git commit -m "feat: haversine distance + near-me sort"
```

---

## Task 12: Socrata source config + build-time data module

**Files:**
- Create: `src/lib/socrataSources.ts`, `src/data/index.ts`
- Modify: none

**Note:** `socrataSources.ts` starts with a small, safe set of dataset ids that are verified in Task 19. If a dataset id proves wrong/stale there, it is corrected in that task. Build must not fail if a feed is down (ingest already falls back to cache/empty).

- [ ] **Step 1: Create the Socrata source config**

Create `src/lib/socrataSources.ts`:
```ts
import type { SocrataSource } from './adapters/nycOpenData';

// Dataset ids + field maps. VERIFY LIVE in Task 19 before relying on them.
export const SOCRATA_SOURCES: SocrataSource[] = [
  {
    dataset: 'ii4d-p2 zj'.replace(' ', ''), // placeholder id — replaced in Task 19
    category: 'Food & Nutrition',
    map: { title: 'facility_name', address: 'address', borough: 'borough',
           zip: 'postcode', phone: 'phone', lat: 'latitude', lng: 'longitude' },
  },
];
```
> Task 19 replaces the dataset id(s) with confirmed values and adds more categories. Until then this may yield zero rows, which is acceptable (site still builds from curated + Parks).

- [ ] **Step 2: Create the build-time data module**

Create `src/data/index.ts`:
```ts
import { getCollection } from 'astro:content';
import { mapCuratedResource, mapCuratedEvent } from '../lib/adapters/curated';
import { ingestAll } from '../lib/ingest';
import { SOCRATA_SOURCES } from '../lib/socrataSources';
import type { Resource, HealthEvent } from '../lib/types';

let cache: { resources: Resource[]; events: HealthEvent[] } | null = null;

export async function getData() {
  if (cache) return cache;
  const curatedResources = (await getCollection('resources')).map(mapCuratedResource);
  const curatedEvents = (await getCollection('events')).map(mapCuratedEvent);
  cache = await ingestAll({
    curatedResources,
    curatedEvents,
    socrataSources: SOCRATA_SOURCES,
    appToken: import.meta.env.NYC_OPEN_DATA_TOKEN,
  });
  return cache;
}

export const getAllResources = async () => (await getData()).resources;
export const getAllEvents = async () => (await getData()).events;
```

- [ ] **Step 3: Verify build still succeeds**

Run: `npm run build`
Expected: build succeeds. Feed fetches may log warnings if endpoints are unreachable in CI — acceptable (fallback to empty).

- [ ] **Step 4: Commit**

```bash
git add src/lib/socrataSources.ts src/data/index.ts
git commit -m "feat: socrata source config + build-time data module"
```

---

## Task 13: Design tokens + base layout (Nav, Footer, Crisis)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`,
  `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/CrisisBanner.astro`

- [ ] **Step 1: Create design tokens**

Create `src/styles/tokens.css`:
```css
:root {
  --teal: #0f766e;
  --teal-dark: #0d6b63;
  --coral: #ff6f5e;
  --crisis: #e4342a;
  --bg: #fbfaf7;
  --surface: #ffffff;
  --border: #e7e2d8;
  --ink: #12312e;
  --ink-soft: #5c6b68;
  --radius: 13px;
  --radius-sm: 8px;
  --space: 1rem;
  --maxw: 1080px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **Step 2: Create global styles**

Create `src/styles/global.css`:
```css
@import "./tokens.css";
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; font-family: var(--font); background: var(--bg); color: var(--ink);
  line-height: 1.5; }
a { color: var(--teal); }
img { max-width: 100%; }
.container { max-width: var(--maxw); margin: 0 auto; padding: 0 1rem; }
.btn { display: inline-block; background: var(--coral); color: #fff; font-weight: 800;
  border: none; border-radius: var(--radius-sm); padding: 13px 18px; cursor: pointer;
  text-decoration: none; }
.btn-teal { background: var(--teal); }
.card { background: var(--surface); border: 2px solid var(--border);
  border-radius: var(--radius); padding: 14px; }
.tag { font-size: .72rem; font-weight: 700; background: #eef4f3; color: var(--teal);
  border-radius: 999px; padding: 2px 9px; display: inline-block; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); }
:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }
```

- [ ] **Step 3: Create the Crisis banner**

Create `src/components/CrisisBanner.astro`:
```astro
---
---
<div style="background:#fff4f2;border-top:2px solid #ffd9d2;padding:14px 0;font-size:.9rem">
  <div class="container">
    <strong style="color:var(--crisis)">Need help now?</strong>
    Call or text <a href="tel:988"><strong>988</strong></a> (Suicide &amp; Crisis Lifeline) ·
    NYC Well: <a href="tel:1-888-692-9355"><strong>1-888-692-9355</strong></a> ·
    Emergency: <a href="tel:911">911</a>
  </div>
</div>
```

- [ ] **Step 4: Create Nav (with persistent crisis link + mobile menu)**

Create `src/components/Nav.astro`:
```astro
---
const links = [
  { href: '/resources', label: 'Resources' },
  { href: '/events', label: 'Events' },
  { href: '/categories', label: 'Categories' },
  { href: '/about', label: 'About' },
];
---
<header style="background:var(--teal);color:#fff">
  <nav class="container" style="display:flex;align-items:center;gap:16px;padding:12px 1rem"
       aria-label="Primary">
    <a href="/" style="color:#fff;text-decoration:none;font-weight:800;font-size:1.1rem;letter-spacing:-.02em">
      NYC Health Finder<span style="color:var(--coral)">.</span>
    </a>
    <button id="navToggle" aria-expanded="false" aria-controls="navLinks"
      style="margin-left:auto;background:none;border:none;color:#fff;font-size:1.5rem;display:none;cursor:pointer">
      <span class="visually-hidden">Menu</span>☰
    </button>
    <div id="navLinks" style="margin-left:auto;display:flex;gap:16px;align-items:center">
      {links.map((l) => (
        <a href={l.href} style="color:#fff;text-decoration:none;font-weight:600;font-size:.9rem">{l.label}</a>
      ))}
      <a href="/about#crisis" style="background:var(--crisis);color:#fff;font-weight:800;
        padding:8px 12px;border-radius:8px;text-decoration:none">🆘 Get Help Now</a>
    </div>
  </nav>
</header>
<style>
  @media (max-width: 720px) {
    #navToggle { display: block !important; }
    #navLinks { display: none !important; position: absolute; left: 0; right: 0;
      flex-direction: column; align-items: flex-start; background: var(--teal-dark);
      padding: 12px 1rem; gap: 12px; z-index: 20; }
    #navLinks.open { display: flex !important; }
  }
</style>
<script>
  const t = document.getElementById('navToggle');
  const n = document.getElementById('navLinks');
  t?.addEventListener('click', () => {
    const open = n?.classList.toggle('open');
    t.setAttribute('aria-expanded', String(!!open));
  });
</script>
```

- [ ] **Step 5: Create Footer (with independence disclaimer)**

Create `src/components/Footer.astro`:
```astro
---
---
<footer style="background:#0b2b28;color:#cfe0dc;margin-top:3rem;padding:2rem 0;font-size:.85rem">
  <div class="container">
    <p style="max-width:60ch">
      <strong>NYC Health Finder</strong> is an independent community resource.
      It is <strong>not affiliated with or endorsed by the City of New York</strong>.
      Always confirm details with the provider. Data is aggregated from public sources
      including NYC Open Data and NYC Parks, plus curated listings.
    </p>
    <p style="margin-top:1rem">
      <a href="/about" style="color:#fff">About &amp; data sources</a>
    </p>
  </div>
</footer>
```

- [ ] **Step 6: Create Base layout**

Create `src/layouts/Base.astro`:
```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
interface Props { title: string; description?: string; }
const { title, description = 'Find free public health resources and events across NYC.' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} · NYC Health Finder</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <a href="#main" class="visually-hidden">Skip to content</a>
    <Nav />
    <main id="main"><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build succeeds (index.astro still default — replaced next task).

- [ ] **Step 8: Commit**

```bash
git add src/styles src/layouts src/components/Nav.astro src/components/Footer.astro src/components/CrisisBanner.astro
git commit -m "feat: design tokens, base layout, nav, footer, crisis banner"
```

---

## Task 14: Cards + category tile components

**Files:**
- Create: `src/components/ResourceCard.astro`, `src/components/EventCard.astro`, `src/components/CategoryTile.astro`

- [ ] **Step 1: ResourceCard**

Create `src/components/ResourceCard.astro`:
```astro
---
import type { Resource } from '../lib/types';
interface Props { r: Resource; }
const { r } = Astro.props;
---
<a href={`/resource/${r.id}`} class="card" style="display:block;text-decoration:none;color:inherit">
  <div style="font-size:.66rem;font-weight:800;color:var(--coral);text-transform:uppercase">
    {r.costNote ?? 'Free'} · {r.categories[0]}
  </div>
  <div style="font-weight:800;margin:4px 0">{r.title}</div>
  <div style="font-size:.82rem;color:var(--ink-soft)">
    {r.borough}{r.neighborhood ? ` · ${r.neighborhood}` : ''}
    {r.howToAccess ? ` · ${r.howToAccess}` : ''}
  </div>
  {r.whoItsFor.length > 0 && (
    <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
      {r.whoItsFor.slice(0, 4).map((w) => <span class="tag">{w}</span>)}
    </div>
  )}
</a>
```

- [ ] **Step 2: EventCard**

Create `src/components/EventCard.astro`:
```astro
---
import type { HealthEvent } from '../lib/types';
interface Props { e: HealthEvent; }
const { e } = Astro.props;
const when = new Date(e.start).toLocaleString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});
---
<a href={`/event/${e.id}`} class="card" style="display:block;text-decoration:none;color:inherit">
  <div style="font-size:.64rem;font-weight:800;color:var(--coral);text-transform:uppercase">{when}</div>
  <div style="font-weight:800;margin:3px 0">{e.title}</div>
  <div style="font-size:.8rem;color:var(--ink-soft)">
    {e.online ? 'Online' : (e.address ?? e.borough)}{e.registrationRequired ? ' · Registration required' : ''}
  </div>
</a>
```

- [ ] **Step 3: CategoryTile**

Create `src/components/CategoryTile.astro`:
```astro
---
interface Props { label: string; emoji: string; slug: string; }
const { label, emoji, slug } = Astro.props;
---
<a href={`/categories/${slug}`} class="card"
   style="text-align:center;text-decoration:none;color:inherit;font-weight:700;font-size:.8rem">
  <div style="font-size:1.6rem">{emoji}</div>{label}
</a>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResourceCard.astro src/components/EventCard.astro src/components/CategoryTile.astro
git commit -m "feat: resource/event cards and category tile"
```

---

## Task 15: Category slug map + Home page

**Files:**
- Create: `src/lib/categoryMeta.ts`, `src/pages/index.astro`
- Modify: replace default `src/pages/index.astro`

- [ ] **Step 1: Category metadata (slug + emoji)**

Create `src/lib/categoryMeta.ts`:
```ts
import { CATEGORIES, type Category } from './types';
import { slugify } from './normalize';

const EMOJI: Record<Category, string> = {
  'Mental Health': '🧠',
  'Sexual & Reproductive Health': '🩺',
  'Vaccines & Screenings': '💉',
  'Harm Reduction & Recovery': '❤️‍🩹',
  'Food & Nutrition': '🥗',
  'Maternal & Family Health': '🤰',
  'Chronic Disease Support': '💗',
  'Fitness & Wellness': '🏃',
  'Insurance & Benefits Navigation': '📋',
  'Housing & Environmental Health': '🏠',
  'Dental & Vision': '🦷',
  'Immigrant Health': '🌍',
};

export const CATEGORY_META = CATEGORIES.map((c) => ({
  label: c, slug: slugify(c), emoji: EMOJI[c],
}));

export function categoryBySlug(slug: string) {
  return CATEGORY_META.find((c) => c.slug === slug);
}
```

- [ ] **Step 2: Home page**

Replace `src/pages/index.astro` with:
```astro
---
import Base from '../layouts/Base.astro';
import CategoryTile from '../components/CategoryTile.astro';
import EventCard from '../components/EventCard.astro';
import CrisisBanner from '../components/CrisisBanner.astro';
import { CATEGORY_META } from '../lib/categoryMeta';
import { getAllEvents } from '../data/index';

const events = (await getAllEvents())
  .filter((e) => new Date(e.start) >= new Date(Date.now() - 864e5))
  .sort((a, b) => +new Date(a.start) - +new Date(b.start))
  .slice(0, 4);
---
<Base title="Free health resources across NYC">
  <section style="background:linear-gradient(180deg,var(--teal),var(--teal-dark));color:#fff">
    <div class="container" style="padding:40px 1rem">
      <h1 style="font-size:2rem;line-height:1.12;max-width:20ch;margin:0">
        Free health resources across NYC — all in one place.
      </h1>
      <p style="opacity:.9;max-width:48ch">Clinics, counseling, food, vaccines, support &amp; events. No cost. No judgment.</p>
      <form action="/resources" method="get" style="display:flex;gap:8px;max-width:520px">
        <label for="q" class="visually-hidden">Search resources</label>
        <input id="q" name="q" placeholder="Search “free vaccines in the Bronx”…"
          style="flex:1;padding:13px;border:none;border-radius:8px" />
        <button class="btn" type="submit">Search</button>
      </form>
      <p style="font-size:.8rem;opacity:.85;margin-top:10px">
        <a href="/resources?near=1" style="color:#fff">📍 Use my location to find what’s nearest</a>
      </p>
    </div>
  </section>

  <section class="container" style="padding:24px 1rem">
    <h2>Browse by need</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
      {CATEGORY_META.map((c) => <CategoryTile label={c.label} emoji={c.emoji} slug={c.slug} />)}
    </div>
  </section>

  <section class="container" style="padding:8px 1rem 24px">
    <h2>This week’s free events</h2>
    {events.length === 0 ? <p>No upcoming events listed yet — check back soon.</p> : (
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
        {events.map((e) => <EventCard e={e} />)}
      </div>
    )}
    <p style="margin-top:12px"><a class="btn btn-teal" href="/events">See all events →</a></p>
  </section>

  <CrisisBanner />
</Base>
```

- [ ] **Step 3: Verify home renders**

Run: `npm run dev`, open `http://localhost:4321/`
Expected: hero, 12 category tiles, events section (shows the seed event), crisis banner. Stop dev.

- [ ] **Step 4: Commit**

```bash
git add src/lib/categoryMeta.ts src/pages/index.astro
git commit -m "feat: category metadata + home page"
```

---

## Task 16: Detail pages (resource + event)

**Files:**
- Create: `src/pages/resource/[slug].astro`, `src/pages/event/[slug].astro`

- [ ] **Step 1: Resource detail with getStaticPaths**

Create `src/pages/resource/[slug].astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import { getAllResources } from '../../data/index';

export async function getStaticPaths() {
  const resources = await getAllResources();
  return resources.map((r) => ({ params: { slug: r.id }, props: { r } }));
}
const { r } = Astro.props;
---
<Base title={r.title} description={r.description}>
  <div class="container" style="padding:24px 1rem;max-width:760px">
    <p><a href="/resources">← Back to resources</a></p>
    <span class="tag">{r.categories.join(' · ')}</span>
    <h1>{r.title}</h1>
    {r.organization && <p style="color:var(--ink-soft)">{r.organization}</p>}
    <p>{r.description}</p>
    <dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:.92rem">
      {r.address && (<><dt><strong>Address</strong></dt><dd>{r.address}, {r.borough} {r.zip ?? ''}</dd></>)}
      {r.hours && (<><dt><strong>Hours</strong></dt><dd>{r.hours}</dd></>)}
      {r.phone && (<><dt><strong>Phone</strong></dt><dd><a href={`tel:${r.phone}`}>{r.phone}</a></dd></>)}
      {r.website && (<><dt><strong>Website</strong></dt><dd><a href={r.website}>{r.website}</a></dd></>)}
      {r.costNote && (<><dt><strong>Cost</strong></dt><dd>{r.costNote}</dd></>)}
      {r.howToAccess && (<><dt><strong>Access</strong></dt><dd>{r.howToAccess}</dd></>)}
      {r.whoItsFor.length > 0 && (<><dt><strong>For</strong></dt><dd>{r.whoItsFor.join(', ')}</dd></>)}
      {r.languagesOffered.length > 0 && (<><dt><strong>Languages</strong></dt><dd>{r.languagesOffered.join(', ')}</dd></>)}
    </dl>
    <p style="font-size:.75rem;color:var(--ink-soft);margin-top:1rem">
      Source: {r.source} · Last updated {r.lastUpdated}
    </p>
  </div>
</Base>
```

- [ ] **Step 2: Event detail**

Create `src/pages/event/[slug].astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import { getAllEvents } from '../../data/index';

export async function getStaticPaths() {
  const events = await getAllEvents();
  return events.map((e) => ({ params: { slug: e.id }, props: { e } }));
}
const { e } = Astro.props;
const when = new Date(e.start).toLocaleString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
});
---
<Base title={e.title} description={e.description}>
  <div class="container" style="padding:24px 1rem;max-width:760px">
    <p><a href="/events">← Back to events</a></p>
    <span class="tag">{e.categories.join(' · ')}</span>
    <h1>{e.title}</h1>
    <p style="font-weight:700;color:var(--coral)">{when}</p>
    <p>{e.description}</p>
    <p><strong>Where:</strong> {e.online ? 'Online' : `${e.address ?? ''}, ${e.borough}`}</p>
    {e.registrationRequired && e.registrationUrl && (
      <p><a class="btn" href={e.registrationUrl}>Register</a></p>
    )}
    <p style="font-size:.75rem;color:var(--ink-soft);margin-top:1rem">
      Source: {e.source} · Last updated {e.lastUpdated}
    </p>
  </div>
</Base>
```

- [ ] **Step 3: Verify build generates detail pages**

Run: `npm run build`
Expected: build succeeds; `dist/resource/the-door/index.html` and `dist/event/bp-screening/index.html` exist.

- [ ] **Step 4: Commit**

```bash
git add src/pages/resource src/pages/event
git commit -m "feat: resource and event detail pages"
```

---

## Task 17: Categories index + category landing pages

**Files:**
- Create: `src/pages/categories/index.astro`, `src/pages/categories/[slug].astro`

- [ ] **Step 1: Categories index**

Create `src/pages/categories/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import CategoryTile from '../../components/CategoryTile.astro';
import { CATEGORY_META } from '../../lib/categoryMeta';
---
<Base title="Browse by category">
  <div class="container" style="padding:24px 1rem">
    <h1>Browse by category</h1>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
      {CATEGORY_META.map((c) => <CategoryTile label={c.label} emoji={c.emoji} slug={c.slug} />)}
    </div>
  </div>
</Base>
```

- [ ] **Step 2: Category landing (resources + events in that category)**

Create `src/pages/categories/[slug].astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import ResourceCard from '../../components/ResourceCard.astro';
import EventCard from '../../components/EventCard.astro';
import { CATEGORY_META, categoryBySlug } from '../../lib/categoryMeta';
import { getAllResources, getAllEvents } from '../../data/index';

export async function getStaticPaths() {
  return CATEGORY_META.map((c) => ({ params: { slug: c.slug } }));
}
const { slug } = Astro.params;
const meta = categoryBySlug(slug!)!;
const resources = (await getAllResources()).filter((r) => r.categories.includes(meta.label as any));
const events = (await getAllEvents()).filter((e) => e.categories.includes(meta.label as any));
---
<Base title={meta.label} description={`Free ${meta.label} resources and events in NYC.`}>
  <div class="container" style="padding:24px 1rem">
    <p><a href="/categories">← All categories</a></p>
    <h1>{meta.emoji} {meta.label}</h1>
    <p><a class="btn btn-teal" href={`/resources?category=${encodeURIComponent(meta.label)}`}>
      Search &amp; filter these on the map →</a></p>

    <h2>Resources</h2>
    {resources.length === 0 ? <p>None listed yet — check back soon.</p> : (
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
        {resources.map((r) => <ResourceCard r={r} />)}
      </div>
    )}

    {events.length > 0 && (
      <>
        <h2>Upcoming events</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
          {events.map((e) => <EventCard e={e} />)}
        </div>
      </>
    )}
  </div>
</Base>
```

- [ ] **Step 3: Verify build generates 12 category pages**

Run: `npm run build`
Expected: `dist/categories/mental-health/index.html` etc. exist (12 total).

- [ ] **Step 4: Commit**

```bash
git add src/pages/categories
git commit -m "feat: categories index and landing pages"
```

---

## Task 18: Resources (Browse) — data endpoint, list, filters, map, near-me

**Files:**
- Create: `src/pages/data/resources.json.ts`, `src/scripts/resources-island.ts`,
  `src/components/FilterBar.astro`, `src/components/ResultsMap.astro`, `src/pages/resources.astro`,
  `src/pages/events.astro`

- [ ] **Step 1: JSON data endpoint (client index)**

Create `src/pages/data/resources.json.ts`:
```ts
import type { APIRoute } from 'astro';
import { getAllResources, getAllEvents } from '../../data/index';

export const GET: APIRoute = async () => {
  const [resources, events] = [await getAllResources(), await getAllEvents()];
  return new Response(JSON.stringify({ resources, events }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

- [ ] **Step 2: Add Leaflet CSS to Base head**

Modify `src/layouts/Base.astro` — add inside `<head>` after the description meta:
```astro
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
```

- [ ] **Step 3: FilterBar component**

Create `src/components/FilterBar.astro`:
```astro
---
import { CATEGORIES, BOROUGHS, WHO_ITS_FOR } from '../lib/types';
---
<form id="filterBar" class="card" style="display:grid;gap:10px" aria-label="Filter resources">
  <div style="display:flex;gap:8px">
    <label for="q" class="visually-hidden">Search</label>
    <input id="q" name="q" placeholder="Search resources…" style="flex:1;padding:12px;border:2px solid var(--border);border-radius:8px" />
    <button type="button" id="nearMe" class="btn btn-teal">📍 Near me</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:12px">
    <label>Category
      <select id="category" multiple size="1" style="max-width:180px">
        {CATEGORIES.map((c) => <option value={c}>{c}</option>)}
      </select>
    </label>
    <label>Borough
      <select id="borough" multiple size="1" style="max-width:150px">
        {BOROUGHS.map((b) => <option value={b}>{b}</option>)}
      </select>
    </label>
    <label>Who it's for
      <select id="for" multiple size="1" style="max-width:160px">
        {WHO_ITS_FOR.map((w) => <option value={w}>{w}</option>)}
      </select>
    </label>
    <button type="button" id="viewToggle" class="btn btn-teal">Map view</button>
  </div>
</form>
```

- [ ] **Step 4: ResultsMap component**

Create `src/components/ResultsMap.astro`:
```astro
---
---
<div id="map" style="display:none;height:420px;border-radius:var(--radius);overflow:hidden;border:2px solid var(--border)"></div>
```

- [ ] **Step 5: Client island — wires everything (search, filters, URL, map, near-me)**

Create `src/scripts/resources-island.ts`:
```ts
import * as L from 'leaflet';
import type { Resource, HealthEvent } from '../lib/types';
import { applyFilters, filtersToParams, paramsToFilters, type Filters } from '../lib/search';
import { sortByDistance } from '../lib/geo';

type Data = { resources: Resource[]; events: HealthEvent[] };

function multiVals(sel: HTMLSelectElement): string[] {
  return [...sel.selectedOptions].map((o) => o.value);
}
function setMulti(sel: HTMLSelectElement, vals: string[]) {
  for (const o of sel.options) o.selected = vals.includes(o.value);
}

async function init() {
  const res = await fetch('/data/resources.json');
  const data: Data = await res.json();
  const listEl = document.getElementById('results')!;
  const q = document.getElementById('q') as HTMLInputElement;
  const cat = document.getElementById('category') as HTMLSelectElement;
  const bor = document.getElementById('borough') as HTMLSelectElement;
  const who = document.getElementById('for') as HTMLSelectElement;
  const mapEl = document.getElementById('map') as HTMLDivElement;
  const toggle = document.getElementById('viewToggle') as HTMLButtonElement;
  const near = document.getElementById('nearMe') as HTMLButtonElement;

  let origin: { lat: number; lng: number } | null = null;
  let map: L.Map | null = null;
  let markers: L.LayerGroup | null = null;

  // hydrate filters from URL
  const initF = paramsToFilters(new URLSearchParams(location.search));
  q.value = initF.q;
  setMulti(cat, initF.categories); setMulti(bor, initF.boroughs); setMulti(who, initF.whoItsFor);

  function currentFilters(): Filters {
    return {
      q: q.value,
      categories: multiVals(cat) as Filters['categories'],
      boroughs: multiVals(bor) as Filters['boroughs'],
      whoItsFor: multiVals(who) as Filters['whoItsFor'],
    };
  }

  function render() {
    const f = currentFilters();
    let items = applyFilters(data.resources, f);
    if (origin) items = sortByDistance(items, origin);

    // update URL (shareable)
    history.replaceState(null, '', `?${filtersToParams(f).toString()}`);

    // list
    listEl.innerHTML = items.length
      ? items.map((r) => `<a class="card" href="/resource/${r.id}" style="display:block;text-decoration:none;color:inherit">
          <div style="font-size:.66rem;font-weight:800;color:var(--coral);text-transform:uppercase">${r.costNote ?? 'Free'} · ${r.categories[0]}</div>
          <div style="font-weight:800;margin:4px 0">${r.title}</div>
          <div style="font-size:.82rem;color:var(--ink-soft)">${r.borough}${origin && r.coordinates ? '' : ''}</div>
        </a>`).join('')
      : `<p>No matches. Try removing a filter.</p>`;
    listEl.setAttribute('aria-live', 'polite');

    // map markers
    if (map && markers) {
      markers.clearLayers();
      for (const r of items) {
        if (!r.coordinates) continue;
        L.marker([r.coordinates.lat, r.coordinates.lng])
          .bindPopup(`<strong>${r.title}</strong><br><a href="/resource/${r.id}">Details</a>`)
          .addTo(markers);
      }
    }
  }

  function ensureMap() {
    if (map) return;
    map = L.map(mapEl).setView([40.7128, -74.006], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }

  toggle.addEventListener('click', () => {
    const showMap = mapEl.style.display === 'none';
    mapEl.style.display = showMap ? 'block' : 'none';
    toggle.textContent = showMap ? 'List view' : 'Map view';
    if (showMap) { ensureMap(); setTimeout(() => map!.invalidateSize(), 0); render(); }
  });

  near.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      near.textContent = '📍 Sorted by nearest';
      render();
    });
  });

  [q, cat, bor, who].forEach((el) => el.addEventListener('input', render));

  // open map immediately if ?near=1 or map param
  if (new URLSearchParams(location.search).get('near') === '1') near.click();
  render();
}

init();
```

- [ ] **Step 6: Resources page**

Create `src/pages/resources.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import FilterBar from '../components/FilterBar.astro';
import ResultsMap from '../components/ResultsMap.astro';
---
<Base title="Find resources">
  <div class="container" style="padding:24px 1rem">
    <h1>Find free health resources</h1>
    <FilterBar />
    <ResultsMap />
    <div id="results" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:14px"></div>
  </div>
  <script>
    import '../scripts/resources-island.ts';
  </script>
</Base>
```

- [ ] **Step 7: Events page (server-rendered list, sorted upcoming)**

Create `src/pages/events.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import EventCard from '../components/EventCard.astro';
import { getAllEvents } from '../data/index';

const events = (await getAllEvents())
  .filter((e) => new Date(e.start) >= new Date(Date.now() - 864e5))
  .sort((a, b) => +new Date(a.start) - +new Date(b.start));
---
<Base title="Upcoming events">
  <div class="container" style="padding:24px 1rem">
    <h1>Upcoming free events</h1>
    {events.length === 0 ? <p>No upcoming events listed yet.</p> : (
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
        {events.map((e) => <EventCard e={e} />)}
      </div>
    )}
  </div>
</Base>
```

- [ ] **Step 8: Verify browse works end-to-end**

Run: `npm run dev`, open `http://localhost:4321/resources`
Expected: the seed resource appears; typing in search filters it; selecting Borough=Manhattan keeps The Door; "Map view" shows a Leaflet map with a pin; URL updates with filter params. Open `/resources?borough=Brooklyn` → pre-filtered. Stop dev.

- [ ] **Step 9: Commit**

```bash
git add src/pages/data src/scripts src/components/FilterBar.astro src/components/ResultsMap.astro src/pages/resources.astro src/pages/events.astro src/layouts/Base.astro
git commit -m "feat: resources browse (search, filters, URL state, map, near-me) + events page"
```

---

## Task 19: About page + verify/confirm live feeds

**Files:**
- Create: `src/pages/about.astro`
- Modify: `src/lib/socrataSources.ts`

- [ ] **Step 1: About page (mission, disclaimer, data sources, crisis anchor)**

Create `src/pages/about.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import CrisisBanner from '../components/CrisisBanner.astro';
---
<Base title="About">
  <div class="container" style="padding:24px 1rem;max-width:760px">
    <h1>About NYC Health Finder</h1>
    <p>NYC Health Finder is a free, independent guide to public health resources and events
      across New York City. Our goal is simple: help anyone find free care, support, and
      services — with no cost and no judgment.</p>

    <h2 id="crisis">Get help now</h2>
    <p>If you are in crisis, call or text <a href="tel:988"><strong>988</strong></a>
      (Suicide &amp; Crisis Lifeline), reach NYC Well at
      <a href="tel:1-888-692-9355">1-888-692-9355</a>, or call <a href="tel:911">911</a>
      in an emergency.</p>

    <h2>Independence</h2>
    <p>This site is an independent community resource. It is <strong>not affiliated with or
      endorsed by the City of New York</strong>. Always confirm details directly with the provider.</p>

    <h2>Where our data comes from</h2>
    <ul>
      <li>Curated listings reviewed by our team</li>
      <li><a href="https://opendata.cityofnewyork.us/">NYC Open Data</a> (DOHMH datasets)</li>
      <li><a href="https://www.nycgovparks.org/events">NYC Parks</a> free fitness &amp; wellness events</li>
    </ul>
  </div>
  <CrisisBanner />
</Base>
```

- [ ] **Step 2: Confirm live NYC Open Data datasets**

Query the NYC Open Data catalog for current, coordinate-bearing DOHMH datasets. For each candidate, verify it returns rows:
```bash
# Example verification (replace <id> with a real dataset id from data.cityofnewyork.us):
curl -s "https://data.cityofnewyork.us/resource/<id>.json?\$limit=2" | head -c 600
```
Confirm the JSON field names for title/address/borough/zip/lat/lng, then update `SOCRATA_SOURCES` in `src/lib/socrataSources.ts` with the real `dataset` ids and correct `map` field names. Add at least 3 datasets spanning different categories (e.g. immunization/flu sites → Vaccines & Screenings; farmers markets → Food & Nutrition; health center locations → Chronic Disease Support). Remove the placeholder entry.

- [ ] **Step 3: Confirm NYC Parks events feed shape**

```bash
curl -s "https://www.nycgovparks.org/xml/events_300_rss.json" | head -c 800
```
If the field names differ from the adapter's assumptions (`title`, `description`, `startdate`, `starttime`, `location`, `coordinates`, `link`), adjust `src/lib/adapters/nycParksEvents.ts` accordingly and update its test fixture to match.

- [ ] **Step 4: Verify a real ingest run**

Run: `NYC_OPEN_DATA_TOKEN=<your-token-or-blank> npm run build`
Expected: build succeeds and pulls real rows (check console for counts; `dist/data/resources.json` contains feed-sourced entries with `source` starting `nyc-open-data:`). If a feed is down, build still succeeds via fallback.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all tests pass (adjust the Parks fixture in Step 3 kept green).

- [ ] **Step 6: Commit**

```bash
git add src/pages/about.astro src/lib/socrataSources.ts src/lib/adapters/nycParksEvents.ts tests/lib/nycParksEvents.test.ts
git commit -m "feat: about page + confirmed live NYC Open Data & Parks feeds"
```

---

## Task 20: Env config + standalone ingest CLI (for CI)

**Files:**
- Create: `.env.example`, `scripts-cli/ingest.mjs`
- Modify: `package.json`, `astro.config.mjs`

- [ ] **Step 1: Env example**

Create `.env.example`:
```
# NYC Open Data (Socrata) app token — register free at
# https://data.cityofnewyork.us/profile/edit/developer_settings
NYC_OPEN_DATA_TOKEN=
```

- [ ] **Step 2: Warm-cache ingest CLI (runs before build in CI so caches are fresh)**

Create `scripts-cli/ingest.mjs`:
```js
// Warms the .cache/ feed files so the subsequent `astro build` uses fresh data,
// and fails soft (never non-zero) so a down feed can't break deploys.
import { fetchNycOpenData } from '../src/lib/adapters/nycOpenData.ts';
import { fetchNycParksEvents } from '../src/lib/adapters/nycParksEvents.ts';
import { SOCRATA_SOURCES } from '../src/lib/socrataSources.ts';
import { writeCache } from '../src/lib/cache.ts';

const token = process.env.NYC_OPEN_DATA_TOKEN;
try {
  const od = await fetchNycOpenData(SOCRATA_SOURCES, { appToken: token });
  if (od.length) writeCache('nyc-open-data', od);
  console.log(`[ingest] nyc-open-data: ${od.length} rows`);
} catch (e) { console.warn('[ingest] nyc-open-data failed:', e.message); }
try {
  const parks = await fetchNycParksEvents();
  if (parks.length) writeCache('nyc-parks', parks);
  console.log(`[ingest] nyc-parks: ${parks.length} rows`);
} catch (e) { console.warn('[ingest] nyc-parks failed:', e.message); }
```

- [ ] **Step 3: Make the ingest script runnable with tsx**

Install tsx and update the script:
```bash
npm install -D tsx
```
Set in `package.json` `"scripts"`:
```json
"ingest": "tsx scripts-cli/ingest.mjs"
```

- [ ] **Step 4: Verify CLI runs**

Run: `npm run ingest`
Expected: prints row counts for both feeds (or soft-fail warnings); `.cache/*.json` written.

- [ ] **Step 5: Commit**

```bash
git add .env.example scripts-cli/ingest.mjs package.json package-lock.json
git commit -m "chore: env example + standalone ingest CLI for CI"
```

---

## Task 21: Nightly rebuild + Cloudflare Pages deploy

**Files:**
- Create: `.github/workflows/nightly.yml`, `README.md`

- [ ] **Step 1: GitHub Actions workflow (nightly + on push)**

Create `.github/workflows/nightly.yml`:
```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 7 * * *'   # 07:00 UTC (~2–3am ET) daily
  workflow_dispatch:

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - name: Warm feed caches
        run: npm run ingest
        env:
          NYC_OPEN_DATA_TOKEN: ${{ secrets.NYC_OPEN_DATA_TOKEN }}
      - name: Build
        run: npm run build
        env:
          NYC_OPEN_DATA_TOKEN: ${{ secrets.NYC_OPEN_DATA_TOKEN }}
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=nyc-health-finder
```

- [ ] **Step 2: README with setup + deploy instructions**

Create `README.md`:
```md
# NYC Health Finder

A free, mobile-first guide to NYC public health resources and events.
Static Astro site; data from curated Markdown + NYC Open Data + NYC Parks, rebuilt nightly.

## Local dev
```bash
npm install
cp .env.example .env    # add your NYC Open Data token (optional locally)
npm run dev
```

## Tests
```bash
npm test
```

## Deploy (Cloudflare Pages via GitHub Actions)
1. Create a Cloudflare Pages project named `nyc-health-finder` (once).
2. In GitHub repo settings → Secrets and variables → Actions, add:
   - `NYC_OPEN_DATA_TOKEN` — from https://data.cityofnewyork.us/profile/edit/developer_settings
   - `CLOUDFLARE_API_TOKEN` — Cloudflare token with Pages:Edit
   - `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard
3. Push to `main`. The workflow builds, tests, warms feed caches, and deploys.
   The nightly cron (`0 7 * * *`) keeps data current automatically.
4. Point `nychealthfinder.org` at the Pages project; redirect `nychealthfinder.com` → `.org`.

## Adding a curated resource
Create `src/content/resources/<slug>.md` with the frontmatter fields validated by
`src/content/config.ts`. Same for events under `src/content/events/`.
```

- [ ] **Step 3: Adjust Astro config for static + endpoints**

Ensure `astro.config.mjs` sets static output (default) and does not force SSR. Confirm it reads:
```js
import { defineConfig } from 'astro/config';
export default defineConfig({ output: 'static' });
```

- [ ] **Step 4: Final full build + test**

Run: `npm test && npm run build`
Expected: all tests pass; `dist/` contains home, resources, events, categories (12), about, detail pages, and `dist/data/resources.json`.

- [ ] **Step 5: Commit**

```bash
git add .github README.md astro.config.mjs
git commit -m "ci: nightly build + Cloudflare Pages deploy, README"
```

---

## Task 22: Accessibility + responsive verification pass

**Files:**
- Modify: any component needing a fix found during the pass

- [ ] **Step 1: Keyboard + screen-reader check**

Run `npm run dev`. With keyboard only: Tab through Home and Resources. Verify: skip link works, nav toggle is reachable and announces expanded state, all interactive controls are focusable with a visible focus ring, filter selects have labels. Fix any gaps.

- [ ] **Step 2: Responsive check at mobile width**

In browser devtools set width to 375px on Home and Resources. Verify: nav collapses to ☰ and "Get Help Now" stays visible; category grid reflows to 2 columns; results grid becomes one column; no horizontal scroll; map (when toggled) fits width. Fix any overflow (e.g. add `overflow-x` guards).

- [ ] **Step 3: Color-contrast check**

Verify text on teal (#0f766e) and coral (#ff6f5e) meets WCAG AA. Note: coral (#ff6f5e) with white text is borderline — if it fails AA for small text, darken the coral used for text/badges to `#e35646` while keeping the lighter coral for large accents. Apply if needed in `tokens.css`.

- [ ] **Step 4: Verify build + tests still green**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: accessibility and responsive polish (WCAG AA)"
```

---

## Self-Review Notes (completed)

- **Spec coverage:** Purpose/hub (Tasks 15–18) · 12 categories (Tasks 2,15,17) · data model (Tasks 2–3) · curated+feeds adapter pattern (Tasks 4,6,7,9,12) · token (Tasks 12,20,21) · search/filter/map/near-me/URL (Tasks 10,11,18) · Leaflet+OSM (Task 18) · warm+clear design (Tasks 13–14) · crisis link + independence disclaimer (Tasks 13,19) · nightly rebuild + Cloudflare (Task 21) · WCAG AA + mobile (Task 22) · translation-ready `languagesOffered` (Task 2). Phase-2 items (submissions, language switcher, federal feeds) intentionally excluded.
- **Placeholder scan:** The only deliberate "placeholder" is the Socrata dataset id in Task 12, which Task 19 explicitly replaces after live verification; flagged in both tasks.
- **Type consistency:** `Resource`/`HealthEvent`/`Entry`, `Filters`, `applyFilters`, `sortByDistance`, `mergeEntries`, `getAllResources`/`getAllEvents`, `SocrataSource` used consistently across tasks.
```
