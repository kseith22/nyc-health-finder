import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORIES, BOROUGHS, WHO_ITS_FOR } from './lib/types';

const base = {
  title: z.string(),
  organization: z.string().optional(),
  description: z.string(),
  categories: z.array(z.enum([...CATEGORIES])).min(1),
  address: z.string().optional(),
  borough: z.enum([...BOROUGHS]),
  neighborhood: z.string().optional(),
  zip: z.string().optional(),
  coordinates: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  hours: z.string().optional(),
  costNote: z.string().optional(),
  whoItsFor: z.array(z.enum([...WHO_ITS_FOR])).default([]),
  languagesOffered: z.array(z.string()).default([]),
  howToAccess: z.enum(['walk-in', 'appointment', 'referral']).optional(),
  lastUpdated: z.string(),
};

const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: z.object(base),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    ...base,
    start: z.string(),
    end: z.string().optional(),
    online: z.boolean().default(false),
    registrationRequired: z.boolean().optional(),
    registrationUrl: z.string().url().optional(),
  }),
});

export const collections = { resources, events };
