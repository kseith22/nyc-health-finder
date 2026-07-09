import type { APIRoute } from 'astro';
import { getAllResources, getAllEvents } from '../../data/index';

export const GET: APIRoute = async () => {
  const [resources, events] = [await getAllResources(), await getAllEvents()];
  return new Response(JSON.stringify({ resources, events }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
