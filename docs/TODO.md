# NYC Health Finder — Roadmap / TODO

Live at **https://nychealthfinder.org** · repo auto-deploys to Cloudflare Pages on push + nightly cron.

## Immediate / follow-up
- [ ] **Watch the first nightly cron run** (`.github/workflows/nightly.yml`, 07:00 UTC) to confirm it builds + deploys cleanly on schedule (all manual pushes have deployed fine).
- [ ] Check back in a few days that Google's "Discovered pages" count is climbing toward ~2,416 in Search Console → Sitemaps.
- [ ] **Google indexing (parked, normal for a new site):** as of 2026-07-15, 4 pages indexed, 17 "Crawled – currently not indexed." This is expected for a ~1-week-old domain — revisit in 2–4 weeks. To help: request indexing for the ~14 key pages (home, 12 category landing pages, About) via URL Inspection; earn a few backlinks / share the site. Optional code follow-up below.

## Next up
- [ ] **Fill the remaining thin categories** — federal/NYC feeds don't cover these; they have only curated anchors: **Insurance & Benefits Navigation** (~4), **Housing & Environmental Health** (~3), **Dental & Vision** (~3), **Immigrant Health** (~3). Options: more curated entries, or find NYC Open Data datasets (e.g. Financial Empowerment Centers, HRA/benefits sites, WIC vendors, dental clinics).
- [ ] **SAMHSA API access (optional; feed works without it).** The form at findtreatment.gov/api-request-form requires a *static* server IP, which doesn't fit our GitHub Actions build (rotating IPs). Plan: email **FindTreatment@samhsa.hhs.gov** instead, describing the daily CI fetch and asking how to register a dynamic-IP/CI client (we already send a descriptive User-Agent). A ready-to-send draft was prepared 2026-07-08. Status: [ ] not yet sent. If they require the form, fill it with the field values noted for the project and reference the email about dynamic IPs.

## Later (Phase 2)
- [ ] "Submit a resource" community form + moderation.
- [ ] Automated translations + language switcher (data model already carries `languagesOffered`).
- [ ] Add a NYC Open Data app token as a GitHub secret `NYC_OPEN_DATA_TOKEN` (raises rate limits; site builds fine without it).
- [ ] Optional: turn off Cloudflare's "Managed robots.txt" if you want our exact robots.txt served (it currently allows search crawlers but drops our `Sitemap:` line — not needed once the sitemap is submitted to Search Console).
- [ ] Optional polish: add an OG image for nicer social-share cards.
- [ ] Optional (SEO): make resource/event detail pages more distinct — feed-generated pages currently share boilerplate descriptions (e.g. all HRSA centers), which contributes to "Crawled – currently not indexed." Vary the per-page description in the adapters/templates to improve indexing.

## Done
- **MVP:** Astro site, 12 categories, search/filter/map (Leaflet) + "Near me", nightly rebuild, WCAG AA, mobile-first.
- **Data feeds (auto-updating):** curated Markdown + NYC Open Data (4 datasets) + NYC Parks events (Socrata `w3wp-dpdi`) + HRSA Health Centers + SAMHSA findtreatment.gov. ~2,332 resources + ~364 events; every category populated (thin ones noted above). Vaccines.gov skipped (public API discontinued July 2024).
- **Curated anchors** filling all previously-empty categories (verified against official sources).
- **Live deployment:** GitHub → Cloudflare Pages; Node 22 in CI; workflow auto-creates the Pages project.
- **Custom domain:** `nychealthfinder.org` (+ `www`) live with SSL; `nychealthfinder.com` 301-redirects to `.org` (path-preserving). Both moved off GoDaddy to Cloudflare nameservers.
- **SEO:** sitemap (`@astrojs/sitemap`), per-page canonical + Open Graph/Twitter tags, robots.txt, and a branded 404 page (fixes soft-404s). Descriptive User-Agent on all outbound feed requests.
- **Google Search Console:** property verified + **sitemap submitted successfully** (2026-07-08). Note: for a *Domain* property, Search Console requires the **full URL** (`https://nychealthfinder.org/sitemap-index.xml`), not just the path — the path-only form throws "Invalid sitemap address."
