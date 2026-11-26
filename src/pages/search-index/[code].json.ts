// /search-index/en.json … — static per-language search index, built at publish time and searched in the browser.
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { articlesIn, authorNames, authorsIn, booksIn, bookUrl, collectionsIn, ebookFormat, ebookUrl, getSite, href, printFormats, stripHtml, translator } from '../../lib/site/site';
export async function getStaticPaths() {
  const s = await getSite();
  return s.languages.map((l) => ({ params: { code: l.prefix || 'en' }, props: { lang: l.code } }));
}
const norm = (x: string) => x.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
export const GET: APIRoute = async ({ props }) => {
  const s = await getSite();
  const lang = s.lang(props.lang as string);
  const L = lang.code;
  const t = translator(s, L);
  const thumb = async (m: any) => (m ? (await getImage({ src: m.url, width: 68, ...(m.width && m.height ? { height: Math.round((68 / m.width) * m.height) } : { inferSize: true }), format: 'webp', quality: 60 })).src : undefined);
  const out: any[] = [];
  for (const b of booksIn(s, L)) {
    const tr = b.tr[L];
    const authors = authorNames(s, b.authors, t);
    const formats = b.formats.map((f) => t(`format.${f.type}`)).join(', ');
    out.push({ t: 'b', n: tr.title, s: [authors, formats].filter(Boolean).join(' · '), u: printFormats(b).length ? bookUrl(lang, b) : ebookUrl(lang, b), i: await thumb(b.cover),
      k: norm([tr.title, tr.subtitle, authors, ...b.formats.map((f) => f.isbn), ...b.tags, ...b.categoryIds.map((c) => s.category.get(c)?.tr[L]?.name)].filter(Boolean).join(' ')) });
  }
  for (const c of collectionsIn(s, L)) out.push({ t: 'b', n: c.tr[L].name, s: t('format.collection'), u: href(lang, `/collections/${c.tr[L].slug}`), k: norm(`${c.tr[L].name} ${t('format.collection')}`) });
  for (const a of authorsIn(s, L)) out.push({ t: 'a', n: a.name, s: t('shop.count', { count: booksIn(s, L).filter((b) => b.authors.includes(a.id)).length }), u: href(lang, `/authors/${a.tr[L].slug}`), k: norm(a.name) });
  for (const a of articlesIn(s, L)) {
    const tr = a.tr[L];
    out.push({ t: 'p', n: tr.title, s: tr.excerpt?.slice(0, 120) ?? undefined, u: href(lang, `/articles/${tr.slug}`), k: norm(`${tr.title} ${tr.excerpt ?? ''} ${stripHtml(tr.html).slice(0, 600)}`) });
  }
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
};
