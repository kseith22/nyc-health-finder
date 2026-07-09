# NYC Health Finder — Roadmap / TODO

## Next up
- [ ] **Auto-updating volume — wire federal feeds** so the thinner categories fill themselves and stay current (matches the "always up to date automatically" goal). Use the existing adapter pattern in `src/lib/adapters/*`, add each to `src/lib/ingest.ts`, verify endpoints live before depending on them:
  - **HRSA Find a Health Center** — FQHCs (primary care, often dental, behavioral, maternal) → Dental & Vision, Maternal & Family Health, Mental Health, Chronic Disease
  - **SAMHSA findtreatment.gov** — mental health & substance-use treatment → Mental Health, Harm Reduction & Recovery
  - **Vaccines.gov** — vaccine locations → Vaccines & Screenings (may need a free API key)
  - Also worth scanning NYC Open Data for datasets covering remaining gaps (Immigrant Health, Housing & Environmental).

## Later (Phase 2)
- [ ] "Submit a resource" community form + moderation
- [ ] Automated translations + language switcher (data model already carries `languagesOffered`)
- [ ] Add a NYC Open Data app token (raises rate limits; site already builds without one)

## Done
- MVP: Astro site, 12 categories, curated + NYC Open Data + NYC Parks feeds, search/filter/map/near-me, nightly rebuild workflow, WCAG AA, ~1,410 resources + 230 events.
- Curated anchors filling all previously-empty categories.
