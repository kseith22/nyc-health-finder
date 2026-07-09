# NYC Health Finder — Roadmap / TODO

## Next up
- [ ] **Fill remaining thin categories** — federal feeds don't cover these; they still have only curated anchors: **Insurance & Benefits Navigation** (4), **Housing & Environmental Health** (3), **Dental & Vision** (3), **Immigrant Health** (3). Options: scan NYC Open Data for datasets (e.g. Financial Empowerment Centers, HRA sites, WIC vendors), add more curated entries, or find a dental-clinic dataset.
- [ ] **File the SAMHSA API access request** (free, no cost/approval gate on the wire) at findtreatment.gov/api-request-form to stay compliant with their terms.
- [ ] Consider adding a NYC Open Data app token (raises rate limits; site builds fine without it).

## Later (Phase 2)
- [ ] "Submit a resource" community form + moderation
- [ ] Automated translations + language switcher (data model already carries `languagesOffered`)
- [ ] Add a NYC Open Data app token (raises rate limits; site already builds without one)

## Done
- MVP: Astro site, 12 categories, curated + NYC Open Data + NYC Parks feeds, search/filter/map/near-me, nightly rebuild workflow, WCAG AA.
- Curated anchors filling all previously-empty categories.
- **Federal feeds (auto-updating volume):** HRSA Health Centers (~434, ArcGIS REST, county-FIPS→borough) and SAMHSA findtreatment.gov (~485, distance search, zip→borough) wired into ingest + cache CLI. Filled Mental Health (→298), Vaccines & Screenings (→437), Maternal & Family Health (→437). Total ~2,332 resources.
- **Vaccines.gov: skipped** — its public API was discontinued July 2024; only stale COVID-only data remains. Do not wire it.
