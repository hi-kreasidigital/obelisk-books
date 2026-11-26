// /sitemap-index.xml → one sitemap per language (roadmap §5.2, §5.7). Submitted to search engines at Launch.
import type { APIRoute } from 'astro';
import { SITE_URL, getSite } from '../lib/site/site';
export const GET: APIRoute = async () => {
  const s = await getSite();
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${s.languages
    .map((l) => `  <sitemap><loc>${SITE_URL}/sitemap-${l.prefix || 'en'}.xml</loc><lastmod>${s.builtAt}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
