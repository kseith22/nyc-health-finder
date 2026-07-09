import type { SocrataSource } from './adapters/nycOpenData';

// Real, live NYC Open Data (Socrata) datasets, verified 2026-07 against
// data.cityofnewyork.us (HTTP 200 + rows with flat lat/lng columns).
export const SOCRATA_SOURCES: SocrataSource[] = [
  // verified 2026-07 — "NYC Farmers Markets" (8vwk-6iz2), ~2115 rows
  {
    dataset: '8vwk-6iz2',
    category: 'Food & Nutrition',
    map: { title: 'marketname', address: 'streetaddress', borough: 'borough',
           hours: 'hoursoperations', lat: 'latitude', lng: 'longitude' },
  },
  // verified 2026-07 — "List of NYC Aging Providers with Sites Open to the
  // Public" (u7wp-np5k), ~417 rows (older-adult / senior center sites)
  {
    dataset: 'u7wp-np5k',
    category: 'Chronic Disease Support',
    map: { title: 'site_name', organization: 'sponsor_vendor', address: 'site_address',
           borough: 'borough', zip: 'zip_code', lat: 'latitude', lng: 'longitude' },
  },
  // verified 2026-07 — "DOHMH HIV Service Directory" (pwts-g83w), ~71 rows
  {
    dataset: 'pwts-g83w',
    category: 'Sexual & Reproductive Health',
    map: { title: 'facilityname', description: 'service_type', address: 'address',
           borough: 'borough', zip: 'zipcode', phone: 'organization_phone',
           website: 'website', lat: 'latitude', lng: 'longitude' },
  },
  // verified 2026-07 — "Pharmaceutical and Syringe Drop-Off Locations in NYC"
  // (edk2-vkjh), ~339 rows
  {
    dataset: 'edk2-vkjh',
    category: 'Harm Reduction & Recovery',
    map: { title: 'sitename', address: 'address', borough: 'borough', zip: 'zipcode',
           phone: 'phonenum', hours: 'days_hours', lat: 'latitude', lng: 'longitude' },
  },
];
