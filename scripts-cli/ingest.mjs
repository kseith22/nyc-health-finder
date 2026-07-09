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
