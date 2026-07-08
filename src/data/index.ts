import { getCollection } from 'astro:content';
import { mapCuratedResource, mapCuratedEvent } from '../lib/adapters/curated';
import { ingestAll } from '../lib/ingest';
import { SOCRATA_SOURCES } from '../lib/socrataSources';
import type { Resource, HealthEvent } from '../lib/types';

let cache: { resources: Resource[]; events: HealthEvent[] } | null = null;

export async function getData() {
  if (cache) return cache;
  const curatedResources = (await getCollection('resources')).map(mapCuratedResource);
  const curatedEvents = (await getCollection('events')).map(mapCuratedEvent);
  cache = await ingestAll({
    curatedResources,
    curatedEvents,
    socrataSources: SOCRATA_SOURCES,
    appToken: import.meta.env.NYC_OPEN_DATA_TOKEN,
  });
  return cache;
}

export const getAllResources = async () => (await getData()).resources;
export const getAllEvents = async () => (await getData()).events;
