// /rss.xml, /fr/rss.xml … — latest articles per language
import type { APIRoute } from 'astro';
import { SITE_URL, articlesIn, getSite, href, langPaths, translator, xml } from '../../lib/site/site';
export const getStaticPaths = langPaths;
export const GET: APIRoute = async ({ props }) => {
  const s = await getSite();
  const lang = s.lang(props.lang as string);
  const t = translator(s, lang.code);
  const items = articlesIn(s, lang.code).slice(0, 30).map((a) => {
    const tr = a.tr[lang.code];
    const url = SITE_URL + href(lang, `/articles/${tr.slug}`);
    const author = a.authorId ? s.author.get(a.authorId)?.name : null;
    return `    <item>\n      <title>${xml(tr.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>\n${author ? `      <dc:creator>${xml(author)}</dc:creator>\n` : ''}${tr.excerpt ? `      <description>${xml(tr.excerpt)}</description>\n` : ''}${a.cover ? `      <enclosure url="${xml(a.cover.url)}" type="image/jpeg" length="0"/>\n` : ''}    </item>`;
  });
  const self = SITE_URL + href(lang, '/rss.xml');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n    <title>${xml(`${t('site.name')} — ${t('nav.articles')}`)}</title>\n    <link>${SITE_URL}${href(lang, '/articles')}</link>\n    <description>${xml(t('meta.articles.desc'))}</description>\n    <language>${lang.code}</language>\n    <atom:link href="${self}" rel="self" type="application/rss+xml"/>\n    <lastBuildDate>${new Date(s.builtAt).toUTCString()}</lastBuildDate>\n${items.join('\n')}\n  </channel>\n</rss>\n`;
  return new Response(body, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
