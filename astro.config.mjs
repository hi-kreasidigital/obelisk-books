// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Static output (roadmap §1). The Worker in src/worker.ts answers /api/* (Phase 3: /api/geo; Phase 4: cart & checkout).
// PUBLIC_SITE_INDEXING=true opens indexing — only at Launch (Phase 9) on www.obeliskbooks.com.
const indexing = process.env.PUBLIC_SITE_INDEXING === 'true';
const fixture = process.env.OBELISK_DATA === 'fixture';

/** Writes _headers (Cloudflare static assets) and robots.txt to match the indexing switch.
 * @returns {import('astro').AstroIntegration} */
const siteFiles = () => ({
  name: 'obelisk-site-files',
  hooks: {
    'astro:build:done': ({ dir }) => {
      /** @param {string} f @param {string} s */
      const out = (f, s) => writeFileSync(fileURLToPath(new URL(f, dir)), s);
      out('_headers', [
        '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin',
        ...(indexing ? [] : ['  X-Robots-Tag: noindex, nofollow']),
        '/_astro/*', '  Cache-Control: public, max-age=31536000, immutable',
        '/fonts/*', '  Cache-Control: public, max-age=31536000, immutable',
        '/search-index/*', '  Cache-Control: public, max-age=300',
        '/rates.json', '  Cache-Control: public, max-age=3600',
        '/admin/*', '  Cache-Control: no-store', '  X-Frame-Options: DENY', '  X-Robots-Tag: noindex, nofollow', '',
      ].join('\n'));
      out('robots.txt', indexing
        ? ['User-agent: *', 'Disallow: /admin', 'Disallow: /account', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /search',
           'Disallow: /sign-in', 'Disallow: /order-lookup', 'Disallow: /order/', 'Disallow: /newsletter/', '',
           'Sitemap: https://www.obeliskbooks.com/sitemap-index.xml', ''].join('\n')
        : '# Temporary / preview addresses are hidden from search engines (roadmap §5.7). Opened at Launch (Phase 9).\nUser-agent: *\nDisallow: /\n');
    },
  },
});

export default defineConfig({
  site: 'https://www.obeliskbooks.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'file', inlineStylesheets: 'always' },
  image: {
    domains: ['dguapjsdwtyjxfcuukgs.supabase.co', ...(fixture ? ['localhost'] : [])],
    remotePatterns: fixture ? [{ protocol: 'http', hostname: 'localhost' }] : [],
  },
  integrations: [react(), siteFiles()],
  vite: { plugins: [tailwindcss()] },
});
