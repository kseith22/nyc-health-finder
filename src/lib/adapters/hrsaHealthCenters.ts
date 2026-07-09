import type { Resource, Borough } from '../types';
import { slugify } from '../normalize';

// HRSA Health Center Service Delivery Sites (layer 18), filtered to the five NYC counties.
// Public ArcGIS REST endpoint, no auth, flat WGS84 coordinates (outSR=4326).
const NYC_COUNTY_FIPS = ['36005', '36047', '36061', '36081', '36085'];
const FIPS_BOROUGH: Record<string, Borough> = {
  '36005': 'Bronx',
  '36047': 'Brooklyn',
  '36061': 'Manhattan',
  '36081': 'Queens',
  '36085': 'Staten Island',
};

const BASE =
  'https://gisportal.hrsa.gov/server/rest/services/HealthCareFacilities/HealthCareFacilities/MapServer/18/query';

function hrsaUrl(): string {
  const where = `CMN_STATE_COUNTY_FIPS_CD IN (${NYC_COUNTY_FIPS.map((f) => `'${f}'`).join(',')})`;
  const params = new URLSearchParams({
    where,
    outFields:
      'SITE_NM,SITE_ADDRESS,SITE_CITY,SITE_ZIP_CD,SITE_PHONE_NUM,SITE_URL,CMN_STATE_COUNTY_FIPS_CD',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '1000',
    f: 'json',
  });
  return `${BASE}?${params.toString()}`;
}

export interface HrsaOpts {
  fetchImpl?: typeof fetch;
}

interface ArcgisFeature {
  attributes: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
}

function str(v: unknown): string | undefined {
  return v == null || v === '' ? undefined : String(v);
}

export async function fetchHrsaHealthCenters(opts: HrsaOpts = {}): Promise<Resource[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(hrsaUrl(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HRSA HTTP ${res.status}`);
  const json = (await res.json()) as { features?: ArcgisFeature[] };
  const features = json.features ?? [];

  return features
    .filter((f) => str(f.attributes?.SITE_NM))
    .map((f) => {
      const a = f.attributes;
      const g = f.geometry ?? {};
      const name = String(a.SITE_NM);
      const borough = FIPS_BOROUGH[String(a.CMN_STATE_COUNTY_FIPS_CD)] ?? 'Citywide/Online';
      const zip = str(a.SITE_ZIP_CD)?.slice(0, 5);
      let website = str(a.SITE_URL);
      if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
      const lat = typeof g.y === 'number' ? g.y : undefined;
      const lng = typeof g.x === 'number' ? g.x : undefined;
      const city = str(a.SITE_CITY);
      const address = [str(a.SITE_ADDRESS), city].filter(Boolean).join(', ') || undefined;

      return {
        id: `hrsa-${slugify(name)}-${zip ?? ''}`,
        kind: 'resource',
        title: name,
        description:
          'Federally funded community health center offering comprehensive primary care on a sliding-fee scale. Services vary by site and may include immunizations, prenatal and family care, and chronic disease management — call to confirm.',
        categories: ['Chronic Disease Support', 'Vaccines & Screenings', 'Maternal & Family Health'],
        address,
        borough,
        zip,
        coordinates: lat != null && lng != null ? { lat, lng } : undefined,
        phone: str(a.SITE_PHONE_NUM),
        website,
        costNote: 'Free or sliding-scale — community health center; uninsured welcome',
        whoItsFor: ['uninsured'],
        languagesOffered: [],
        source: 'hrsa',
        lastUpdated: new Date().toISOString().slice(0, 10),
      } as Resource;
    });
}
