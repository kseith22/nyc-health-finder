import type { SocrataSource } from './adapters/nycOpenData';

// Dataset ids + field maps. VERIFY LIVE in Task 19 before relying on them.
export const SOCRATA_SOURCES: SocrataSource[] = [
  {
    dataset: 'ii4d-p2 zj'.replace(' ', ''), // placeholder id — replaced in Task 19
    category: 'Food & Nutrition',
    map: { title: 'facility_name', address: 'address', borough: 'borough',
           zip: 'postcode', phone: 'phone', lat: 'latitude', lng: 'longitude' },
  },
];
