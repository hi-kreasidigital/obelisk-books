// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static output (roadmap §1). The Worker for /api routes is added in Phase 4.
export default defineConfig({
  site: 'https://www.obeliskbooks.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
