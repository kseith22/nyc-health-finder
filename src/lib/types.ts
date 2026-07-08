export const CATEGORIES = [
  'Mental Health',
  'Sexual & Reproductive Health',
  'Vaccines & Screenings',
  'Harm Reduction & Recovery',
  'Food & Nutrition',
  'Maternal & Family Health',
  'Chronic Disease Support',
  'Fitness & Wellness',
  'Insurance & Benefits Navigation',
  'Housing & Environmental Health',
  'Dental & Vision',
  'Immigrant Health',
] as const;

export const BOROUGHS = [
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
  'Citywide/Online',
] as const;

export const WHO_ITS_FOR = [
  'youth', 'seniors', 'LGBTQ+', 'immigrants', 'uninsured',
  'pregnant people', 'families', 'veterans', 'people who use drugs',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Borough = (typeof BOROUGHS)[number];
export type WhoItsFor = (typeof WHO_ITS_FOR)[number];

export interface Coordinates { lat: number; lng: number; }

export interface Resource {
  id: string;
  kind: 'resource';
  title: string;
  organization?: string;
  description: string;
  categories: Category[];
  address?: string;
  borough: Borough;
  neighborhood?: string;
  zip?: string;
  coordinates?: Coordinates;
  phone?: string;
  website?: string;
  email?: string;
  hours?: string;
  costNote?: string;
  whoItsFor: WhoItsFor[];
  languagesOffered: string[];
  howToAccess?: 'walk-in' | 'appointment' | 'referral';
  source: string;
  lastUpdated: string;
}

export interface HealthEvent extends Omit<Resource, 'kind'> {
  kind: 'event';
  start: string;
  end?: string;
  online: boolean;
  registrationRequired?: boolean;
  registrationUrl?: string;
}

export type Entry = Resource | HealthEvent;

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
