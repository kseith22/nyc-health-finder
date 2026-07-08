import type { CollectionEntry } from 'astro:content';
import type { Resource, HealthEvent } from '../types';

type ResourceData = CollectionEntry<'resources'>['data'];

function mapBase(id: string, d: ResourceData): Omit<Resource, 'kind'> {
  return {
    id,
    title: d.title,
    organization: d.organization,
    description: d.description,
    categories: d.categories,
    address: d.address,
    borough: d.borough,
    neighborhood: d.neighborhood,
    zip: d.zip,
    coordinates: d.coordinates,
    phone: d.phone,
    website: d.website,
    email: d.email,
    hours: d.hours,
    costNote: d.costNote,
    whoItsFor: d.whoItsFor,
    languagesOffered: d.languagesOffered,
    howToAccess: d.howToAccess,
    source: 'curated',
    lastUpdated: d.lastUpdated,
  };
}

export function mapCuratedResource(entry: CollectionEntry<'resources'>): Resource {
  return { ...mapBase(entry.id, entry.data), kind: 'resource' };
}

export function mapCuratedEvent(entry: CollectionEntry<'events'>): HealthEvent {
  const d = entry.data;
  return {
    ...mapBase(entry.id, d),
    kind: 'event',
    start: d.start,
    end: d.end,
    online: d.online ?? false,
    registrationRequired: d.registrationRequired,
    registrationUrl: d.registrationUrl,
  };
}
