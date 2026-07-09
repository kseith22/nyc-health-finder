import type { Resource, Category } from '../types';
import { slugify, boroughFromZip } from '../normalize';

// SAMHSA findtreatment.gov locator (behavioral health: mental health + substance use).
// Public JSON endpoint, no key enforced on the wire. Distance search around downtown NYC.
const BASE = 'https://findtreatment.gov/locator/exportsAsJson/v2';
const NYC_CENTER = '40.7128,-74.0060';
const RADIUS_METERS = '25000'; // ~15.5 mi — covers all five boroughs
const PAGE_SIZE = 100;

function samhsaUrl(page: number): string {
  const params = new URLSearchParams({
    sAddr: NYC_CENTER,
    limitType: '2', // distance
    limitValue: RADIUS_METERS,
    sType: 'both',
    pageSize: String(PAGE_SIZE),
    page: String(page),
    sort: '0',
  });
  return `${BASE}?${params.toString()}`;
}

export interface SamhsaOpts {
  fetchImpl?: typeof fetch;
  maxPages?: number;
}

interface SamhsaRow {
  name1?: string;
  name2?: string;
  street1?: string;
  street2?: string;
  city?: string;
  zip?: string;
  phone?: string;
  website?: string;
  latitude?: string;
  longitude?: string;
  typeFacility?: string;
}

function str(v: unknown): string | undefined {
  return v == null || v === '' ? undefined : String(v);
}

function categoriesFor(typeFacility: string): Category[] {
  const t = typeFacility.toUpperCase();
  const cats: Category[] = [];
  if (t.includes('MH')) cats.push('Mental Health');
  if (t.includes('SA')) cats.push('Harm Reduction & Recovery');
  return cats.length ? cats : ['Mental Health'];
}

export async function fetchSamhsaTreatment(opts: SamhsaOpts = {}): Promise<Resource[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const hardCap = opts.maxPages ?? 20; // safety bound on pagination
  const out: Resource[] = [];

  let page = 1;
  let totalPages = 1;
  do {
    const res = await doFetch(samhsaUrl(page), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`SAMHSA HTTP ${res.status}`);
    const json = (await res.json()) as { totalPages?: number; rows?: SamhsaRow[] };
    totalPages = json.totalPages ?? 1;

    for (const r of json.rows ?? []) {
      const name = str(r.name1);
      if (!name) continue;
      const zip = str(r.zip)?.slice(0, 5);
      const lat = r.latitude != null ? parseFloat(r.latitude) : NaN;
      const lng = r.longitude != null ? parseFloat(r.longitude) : NaN;
      const address =
        [str(r.street1), str(r.street2), str(r.city)].filter(Boolean).join(', ') || undefined;

      out.push({
        id: `samhsa-${slugify(name)}-${zip ?? ''}`,
        kind: 'resource',
        title: name,
        organization: str(r.name2),
        description:
          'Behavioral health treatment facility (mental health and/or substance use services) listed in the SAMHSA treatment locator. Call to confirm services, eligibility, and cost.',
        categories: categoriesFor(str(r.typeFacility) ?? ''),
        address,
        borough: boroughFromZip(zip),
        zip,
        coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
        phone: str(r.phone),
        website: str(r.website),
        costNote: 'Varies — call to confirm; many accept Medicaid or sliding scale',
        whoItsFor: [],
        languagesOffered: [],
        source: 'samhsa',
        lastUpdated: new Date().toISOString().slice(0, 10),
      } as Resource);
    }
    page += 1;
  } while (page <= totalPages && page <= hardCap);

  return out;
}
