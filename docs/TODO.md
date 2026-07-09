# NYC Health Finder — Roadmap / TODO

Live at **https://nychealthfinder.org** · repo auto-deploys to Cloudflare Pages on push + nightly cron.

## Immediate / follow-up
- [ ] **Finish Google Search Console sitemap submission.** Property `nychealthfinder.org` is added; sitemap is `https://nychealthfinder.org/sitemap-index.xml`. As of 2026-07-08 the submission errored ("Sitemap is HTML" / "Invalid") because Google's DNS cache still pointed the domain at GoDaddy's old parking page after the nameserver move. Public resolvers (incl. 8.8.8.8) have since flipped to Cloudflare. **Action: wait for full propagation (a few hours to ~24h), then re-submit `sitemap-index.xml` in Search Console → Sitemaps.** It should read "Success" and begin discovering the ~2,416 pages. No config changes needed.
- [ ] **Watch the first nightly cron run** (`.github/workflows/nightly.yml`, 07:00 UTC) to confirm it builds + deploys cleanly on schedule (all manual pushes have deployed fine).

## Next up
- [ ] **Fill the remaining thin categories** — federal/NYC feeds don't cover these; they have only curated anchors: **Insurance & Benefits Navigation** (~4), **Housing & Environmental Health** (~3), **Dental & Vision** (~3), **Immigrant Health** (~3). Options: more curated entries, or find NYC Open Data datasets (e.g. Financial Empowerment Centers, HRA/benefits sites, WIC vendors, dental clinics).
- [ ] **File the free SAMHSA API access request** at findtreatment.gov/api-request-form to stay compliant with their terms (endpoint works without it today).

## Later (Phase 2)
- [ ] "Submit a resource" community form + moderation.
- [ ] Automated translations + language switcher (data model already carries `languagesOffered`).
- [ ] Add a NYC Open Data app token as a GitHub secret `NYC_OPEN_DATA_TOKEN` (raises rate limits; site builds fine without it).
- [ ] Optional: turn off Cloudflare's "Managed robots.txt" if you want our exact robots.txt served (it currently allows search crawlers but drops our `Sitemap:` line — not needed once the sitemap is submitted to Search Console).
- [ ] Optional polish: add an OG image for nicer social-share cards.

## Done
- **MVP:** Astro site, 12 categories, search/filter/map (Leaflet) + "Near me", nightly rebuild, WCAG AA, mobile-first.
- **Data feeds (auto-updating):** curated Markdown + NYC Open Data (4 datasets) + NYC Parks events (Socrata `w3wp-dpdi`) + HRSA Health Centers + SAMHSA findtreatment.gov. ~2,332 resources + ~364 events; every category populated (thin ones noted above). Vaccines.gov skipped (public API discontinued July 2024).
- **Curated anchors** filling all previously-empty categories (verified against official sources).
- **Live deployment:** GitHub → Cloudflare Pages; Node 22 in CI; workflow auto-creates the Pages project.
- **Custom domain:** `nychealthfinder.org` (+ `www`) live with SSL; `nychealthfinder.com` 301-redirects to `.org` (path-preserving). Both moved off GoDaddy to Cloudflare nameservers.
- **SEO:** sitemap (`@astrojs/sitemap`), per-page canonical + Open Graph/Twitter tags, robots.txt, and a branded 404 page (fixes soft-404s). Descriptive User-Agent on all outbound feed requests.
