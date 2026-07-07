# NYC Health Finder — Design Spec

**Date:** 2026-07-07
**Status:** Approved design, pending implementation plan
**Domain:** nychealthfinder.org (primary) + nychealthfinder.com (redirect)

## 1. Purpose

A centralized, mobile-first website where NYC residents and visitors can find **free public health resources and events** — clinics, counseling, vaccines, food assistance, harm reduction, support groups, screenings, seminars, and more — in one searchable place. Ongoing resources and dated events live side by side ("a true hub"), searchable and filterable across both.

**North star:** the site stays **up to date automatically with minimal maintenance.** Content is stored as structured data so curated entries and live API feeds flow through one pipeline; a scheduled job rebuilds the site nightly.

### Non-goals (for launch)
- Not a telehealth or booking platform — it links out to providers.
- Not multilingual at launch (English only, but data model is translation-ready).
- Not a user-account system — no logins.
- Not an official government site — explicitly independent (see §9).

## 2. Audience & principles
- **Primary:** NYC residents seeking free health services, often on a phone, sometimes in urgent need.
- **Secondary:** visitors, and caseworkers/advocates sharing links to specific resources.
- **Principles:** mobile-first, plain-language (health literacy), WCAG 2.1 AA accessible, fast on weak connections, "no cost, no judgment" tone.

## 3. Scope of "public health" (broad & comprehensive)
Twelve launch categories:
Mental Health · Sexual & Reproductive Health · Vaccines & Screenings · Harm Reduction & Recovery · Food & Nutrition · Maternal & Family Health · Chronic Disease Support · Fitness & Wellness · Insurance & Benefits Navigation · Housing & Environmental Health · Dental & Vision · Immigrant Health

## 4. Site structure

**Top nav (every page):** Home · Resources · Events · Categories · About — plus a persistent red **"Get Help Now (988)"** crisis link. On mobile, nav collapses to a menu (☰) but "Help" stays visible.

| Page | Purpose |
|---|---|
| **Home** | Mission + primary search bar; category tiles (all 12); "This week's events" strip; "Near you" map preview; crisis banner. |
| **Resources (Browse)** | The workhorse: keyword search + filters, with a **List ⇄ Map toggle**. The map lives here (no separate Map page). |
| **Events** | Same data filtered to dated items, sorted by date; "this week" quick filter. |
| **Categories** | Index of the 12 categories → each category landing page. |
| **Category landing** (e.g. `/mental-health`) | Intro + that category's resources & events. Primary SEO surface. |
| **Detail page** | One per resource/event: address, hours, phone, eligibility, "who it's for," map pin, source attribution. |
| **About** | Mission + independence disclaimer + data-source credits. |
| **Phase 2 (structured now, built later)** | "Submit a resource" form; language switcher. |

## 5. Content data model

Two content types, validated by Astro content collections (Zod schema) so entries never malform.

### Resource (ongoing service)
- `title`, `organization`, `description` (plain-language)
- `category[]` (from the fixed list of 12)
- `address`, `borough`, `neighborhood`, `zip`
- `coordinates` { lat, lng } — for the map pin
- `phone`, `website`, `email`
- `hours`
- `cost_note` (e.g. "Free", "Free w/ insurance", "No ID required", "No appointment")
- `who_its_for[]` (youth, seniors, LGBTQ+, immigrants, uninsured, pregnant people, families, veterans, people who use drugs — extensible)
- `languages_offered[]` (services available in these languages; useful now, seeds future translation)
- `how_to_access` (walk-in / appointment / referral)
- `source` (`curated` or a feed id) + `last_updated` — **powers auto-updates & attribution**

### Event (dated) = relevant Resource fields **plus**
- `start`, `end` (datetime)
- `location` (physical address + coordinates **or** "Online")
- `registration` (required? link?)

### Controlled vocabularies
- **Boroughs:** Manhattan · Brooklyn · Queens · Bronx · Staten Island · Citywide/Online
- **Categories:** the 12 in §3
- **Who it's for:** the tag list above

## 6. Data sources & ingestion (feeds at launch)

**Adapter pattern:** every source is an adapter that outputs the common schema in §5. Build pipeline:
`fetch feeds → normalize each into schema → merge with curated Markdown → de-dupe → render`.
If a feed is unreachable during a build, fall back to the last good cached copy so the site never breaks. Every entry displays its `source`.

**Launch sources:**
1. **Curated Markdown** — hand-authored high-quality entries.
2. **NYC Open Data (Socrata / DOHMH)** — clinics, immunization sites, farmers markets, food access. JSON API; uses a free **app token** (stored as an env var / CI secret) to raise rate limits. Most datasets include lat/lng (no geocoding needed).
3. **NYC Parks Events** — free fitness/wellness events for the Events side.

Each endpoint will be verified live for availability and data quality during implementation before the site depends on it.

**Fast-follow feeds (same adapter pattern, no rewrite):** HRSA Find a Health Center; SAMHSA findtreatment.gov; Vaccines.gov.

## 7. Search, filters & map behavior (Resources page)
- **Live keyword search** over a pre-built client-side index (no server).
- **Filters:** category, borough, "who it's for" — freely combinable.
- **List ⇄ Map in sync:** the map pins exactly what the filtered list shows. Click pin → mini card → detail.
- **"Near me":** with permission, sort by distance using the browser's geolocation (free).
- **Shareable filtered views:** filter state lives in the URL, so a link like "free vaccines in the Bronx" opens pre-filtered.
- **Map stack:** Leaflet + OpenStreetMap tiles (free, no billing).
- Mobile-first, keyboard-navigable, screen-reader friendly.

## 8. Visual design
**"Warm + Clear" direction** — blends high readability with an approachable, non-institutional feel:
- **Palette:** teal primary (#0f766e), coral accent (#ff6f5e), warm off-white background (#fbfaf7), red (#e4342a) reserved for the crisis link.
- **Type:** large, high-contrast, bold headings; generous spacing.
- **Shape:** rounded cards, big tap targets.
- **Tone:** welcoming and plain-spoken ("No cost. No judgment.").
- Fully responsive: 4-col grids → 2-col → single column; nav → menu; content stacks vertically on phones.

## 9. Trust & compliance
- **Independence disclaimer** in the footer of every page: *"An independent community resource. Not affiliated with or endorsed by the City of New York."*
- **Source attribution** on entries sourced from public data.
- No collection of personal health information; "Near me" geolocation is processed client-side and never stored.
- Accessibility target: **WCAG 2.1 AA**.

## 10. Technical architecture
- **Framework:** Astro (static output). Content collections for typed resources/events.
- **Search:** client-side index (e.g. Pagefind or Fuse.js) over pre-built data.
- **Map:** Leaflet + OpenStreetMap.
- **Interactivity:** small JS "islands" for search/filter/map; URL-driven filter state.
- **Hosting:** Cloudflare Pages (free).
- **Source control / CI:** GitHub repo. A **nightly GitHub Action** re-runs feed ingestion + build and redeploys, keeping data current. Feed cache committed/persisted for resilience.
- **Secrets:** NYC Open Data app token as a CI secret + local `.env` (`.env.example` committed).

## 11. Phasing
- **Phase 1 (launch):** structure, 12 categories, curated Markdown + NYC Open Data + NYC Parks Events, search/filter/map, "Near me", nightly rebuild, About + disclaimer, deploy to Cloudflare Pages.
- **Phase 2:** federal feeds (HRSA, SAMHSA, Vaccines.gov); "Submit a resource" form + moderation; automated translations + language switcher.

## 12. Open items to confirm during implementation
- Live-verify each feed endpoint and field mapping.
- Final search library choice (Pagefind vs Fuse.js) based on dataset size.
- Exact NYC Open Data dataset IDs per category.
