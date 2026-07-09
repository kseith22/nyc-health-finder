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
