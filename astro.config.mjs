import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nychealthfinder.org',
  output: 'static',
  integrations: [
    // Exclude the JSON data endpoint from the sitemap; only index real pages.
    sitemap({ filter: (page) => !page.includes('/data/') }),
  ],
});
