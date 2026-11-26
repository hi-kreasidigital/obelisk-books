// /sitemap-en.xml, /sitemap-fr.xml … — indexable pages of one language, with hreflang alternates and images.
import type { APIRoute } from 'astro';
import { SITE_URL, getSite, indexablePages, xml } from '../lib/site/site';
export async function getStaticPaths() {
  const s = await getSite();
  return s.languages.map((l) => ({ params: { code: l.prefix || 'en' }, props: { lang: l.code } }));
}
export const GET: APIRoute = async ({ props }) => {
  const s = await getSite();
  const L = props.lang as string;
  const rows = indexablePages(s).filter((p) => p.urls[L]).map((p) => {
    const alts = Object.entries(p.urls).map(([c, u]) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${SITE_URL}${xml(u)}"/>`);
    if (p.urls.en) alts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${xml(p.urls.en)}"/>`);
    const imgs = (p.images?.[L] ?? []).map((i) => `    <image:image><image:loc>${xml(i)}</image:loc></image:image>`);
    return `  <url>\n    <loc>${SITE_URL}${xml(p.urls[L])}</loc>\n${p.lastmod ? `    <lastmod>${p.lastmod.slice(0, 10)}</lastmod>\n` : ''}${[...alts, ...imgs].join('\n')}\n  </url>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
