// Loads everything the public site needs, once per build.
// Source: Supabase with the publishable key (RLS only exposes published items and complete translations in
// enabled languages) — or, with OBELISK_DATA=fixture, the local test data in fixtures/ (no network needed).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, STORAGE_PUBLIC } from '../config';
import type { Article, Author, Book, Category, Collection, Format, Lang, Media, Money, SiteData } from './types';

export const TABLES = [
  'languages', 'text_keys', 'text_translations', 'settings', 'media',
  'authors', 'author_translations', 'categories', 'category_translations', 'collections', 'collection_translations',
  'books', 'book_translations', 'book_contributors', 'book_categories', 'book_gallery', 'related_books', 'related_articles',
  'formats', 'bundle_items', 'preview_pages', 'lists', 'list_translations', 'list_items',
  'articles', 'article_translations', 'article_categories', 'article_books', 'instagram_tiles',
  'shipping_regions', 'shipping_options',
] as const;
type Raw = Record<(typeof TABLES)[number], any[]> & { lowest30: Record<string, Partial<Money>>; storage: string };

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined) ?? (import.meta.env as any)[k];

async function fetchRaw(): Promise<Raw> {
  const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const raw: any = { storage: STORAGE_PUBLIC, lowest30: {} };
  await Promise.all(TABLES.map(async (t) => {
    const rows: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(t).select('*').range(from, from + 999);
      if (error) throw new Error(`Supabase: reading ${t} failed: ${error.message}`);
      rows.push(...data);
      if (data.length < 1000) break;
    }
    raw[t] = rows;
  }));
  // EU price rule: lowest price in the 30 days before the sale started
  const now = Date.now();
  for (const f of raw.formats) {
    if (!saleActive(f, now)) continue;
    const r: Partial<Money> = {};
    for (const c of ['EUR', 'USD'] as const) {
      const { data } = await sb.rpc('lowest_price_30d', { f: f.id, currency: c, before: f.sale_starts_at ?? new Date(now).toISOString() });
      if (typeof data === 'number') r[c] = data;
    }
    raw.lowest30[f.id] = r;
  }
  return raw;
}

function saleActive(f: any, now: number) {
  if (f.sale_price_eur_cents == null && f.sale_price_usd_cents == null) return false;
  if (f.sale_starts_at && Date.parse(f.sale_starts_at) > now) return false;
  if (f.sale_ends_at && Date.parse(f.sale_ends_at) <= now) return false;
  return true;
}

const byLang = <T,>(rows: any[], idKey: string, map: (r: any) => T) => {
  const out = new Map<string, Record<string, T>>();
  for (const r of rows) {
    const m = out.get(r[idKey]) ?? {};
    m[r.lang] = map(r);
    out.set(r[idKey], m);
  }
  return out;
};
const group = (rows: any[], key: string) => {
  const m = new Map<string, any[]>();
  for (const r of rows) m.set(r[key], [...(m.get(r[key]) ?? []), r]);
  return m;
};

export function buildSiteData(raw: Raw, source: SiteData['source']): SiteData {
  const now = Date.now();
  const storage = raw.storage;
  const url = (bucket: string, path: string) =>
    /^https?:\/\//.test(path) ? path : `${storage}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;

  // ---------- languages & website text
  const enabled: Lang[] = raw.languages.filter((l) => l.enabled)
    .map((l) => ({ code: l.code, prefix: l.url_prefix, nameEn: l.name_en, native: l.native_name, sort: l.sort }))
    .sort((a, b) => a.sort - b.sort);
  const activeKeys = raw.text_keys.filter((k) => !k.removed_at).map((k) => k.key as string);
  const text: SiteData['text'] = {};
  for (const t of raw.text_translations) (text[t.lang] ??= {})[t.key] = t.value;
  const textCompleteness: SiteData['textCompleteness'] = {};
  for (const l of enabled) {
    const have = text[l.code] ?? {};
    textCompleteness[l.code] = { done: activeKeys.filter((k) => have[k]?.trim()).length, total: activeKeys.length };
  }
  // English always; another language only once all its website text is in (no half-translated pages)
  const languages = enabled.filter((l) => l.prefix === '' || textCompleteness[l.code].done === textCompleteness[l.code].total);

  const settings: Record<string, any> = {};
  for (const s of raw.settings) settings[s.key] = s.value;

  // ---------- media
  const media = new Map<string, Media>();
  for (const m of raw.media) media.set(m.id, { id: m.id, bucket: m.bucket, path: m.path, url: url(m.bucket, m.path), width: m.width, height: m.height, alt: m.alt ?? {} });
  const med = (id: string | null) => (id ? media.get(id) ?? null : null);

  // ---------- taxonomy
  const seo = (r: any) => ({ seoTitle: r.seo_title, seoDescription: r.seo_description });
  const aTr = byLang(raw.author_translations, 'author_id', (r) => ({ slug: r.slug, bio: r.bio, ...seo(r) }));
  const authors: Author[] = raw.authors.map((a) => ({
    id: a.id, name: a.name, sortName: a.sort_name || a.name, photo: med(a.photo_media_id), website: a.website_url, sort: a.sort, tr: aTr.get(a.id) ?? {},
  })).sort((a, b) => a.sort - b.sort || a.sortName.localeCompare(b.sortName));
  const taxTr = (rows: any[], k: string) => byLang(rows, k, (r) => ({ slug: r.slug, name: r.name, intro: r.intro, ...seo(r) }));
  const cTr = taxTr(raw.category_translations, 'category_id');
  const categories: Category[] = raw.categories.map((c) => ({ id: c.id, sort: c.sort, image: med(c.image_media_id), tr: cTr.get(c.id) ?? {} }))
    .sort((a, b) => a.sort - b.sort);
  const colTr = taxTr(raw.collection_translations, 'collection_id');
  const collections: Collection[] = raw.collections.map((c) => ({ id: c.id, sort: c.sort, cover: med(c.cover_media_id), tr: colTr.get(c.id) ?? {} }))
    .sort((a, b) => a.sort - b.sort);

  // ---------- formats
  const members = group([...raw.bundle_items].sort((a, b) => a.position - b.position), 'bundle_format_id');
  const previews = group([...raw.preview_pages].sort((a, b) => a.page_no - b.page_no), 'format_id');
  const toFormat = (f: any): Format => {
    const active = saleActive(f, now);
    const regular = { EUR: f.price_eur_cents, USD: f.price_usd_cents };
    return {
      id: f.id, bookId: f.book_id, collectionId: f.collection_id, type: f.type, bundleOf: f.bundle_of, isbn: f.isbn13,
      regular,
      price: {
        EUR: active && f.sale_price_eur_cents != null ? f.sale_price_eur_cents : regular.EUR,
        USD: active && f.sale_price_usd_cents != null ? f.sale_price_usd_cents : regular.USD,
      },
      onSale: active, saleEndsAt: active ? f.sale_ends_at : null,
      lowest30: active ? raw.lowest30[f.id] ?? {} : {},
      availability: f.availability, releaseDate: f.release_date, pages: f.pages,
      widthMm: f.width_mm != null ? Number(f.width_mm) : null, heightMm: f.height_mm != null ? Number(f.height_mm) : null, weightG: f.weight_g,
      members: (members.get(f.id) ?? []).map((m) => m.member_format_id),
      preview: (previews.get(f.id) ?? []).map((p) => ({ url: url('previews', p.path), width: p.width, height: p.height })),
    };
  };
  const order = { paperback: 1, hardcover: 2, ebook: 3, bundle: 4 } as const;
  const formats = raw.formats.map(toFormat).sort((a, b) => order[a.type] - order[b.type]);
  const fByBook = group(formats.filter((f) => f.bookId), 'bookId');

  // ---------- books
  const bTr = byLang(raw.book_translations, 'book_id', (r) => ({
    slug: r.slug, title: r.title, subtitle: r.subtitle, description: r.description, headingH2: r.heading_h2, headingH3: r.heading_h3, ...seo(r),
  }));
  const contrib = group([...raw.book_contributors].sort((a, b) => a.position - b.position), 'book_id');
  const bCats = group(raw.book_categories, 'book_id');
  const gallery = group([...raw.book_gallery].sort((a, b) => a.position - b.position), 'book_id');
  const relB = group([...raw.related_books].sort((a, b) => a.position - b.position), 'book_id');
  const relA = group([...raw.related_articles].sort((a, b) => a.position - b.position), 'book_id');
  const books: Book[] = raw.books.map((b) => ({
    id: b.id, textLanguage: b.text_language, publisher: b.publisher, collectionId: b.collection_id, position: b.collection_position,
    cover: med(b.cover_media_id), gallery: (gallery.get(b.id) ?? []).map((g) => med(g.media_id)).filter(Boolean) as Media[],
    retailerLinks: (Array.isArray(b.retailer_links) ? b.retailer_links : []).filter((l: any) => l?.url && !/kindle|amazon\.[a-z.]+\/.*kindle/i.test(`${l.label} ${l.url}`)),
    featured: b.featured, tags: b.tags ?? [],
    authors: (contrib.get(b.id) ?? []).filter((c) => c.role === 'author').map((c) => c.author_id),
    translators: (contrib.get(b.id) ?? []).filter((c) => c.role === 'translator').map((c) => c.author_id),
    categoryIds: (bCats.get(b.id) ?? []).map((c) => c.category_id),
    relatedBookIds: (relB.get(b.id) ?? []).map((r) => r.related_book_id),
    relatedArticleIds: (relA.get(b.id) ?? []).map((r) => r.article_id),
    formats: fByBook.get(b.id) ?? [],
    updatedAt: b.updated_at,
    tr: bTr.get(b.id) ?? {},
  })).filter((b) => b.formats.length > 0);

  // complete-collection sets: only when every member is visible
  const visible = new Set(formats.map((f) => f.id));
  const setFormats = formats.filter((f) => f.type === 'bundle' && f.members.length > 0 && f.members.every((m) => visible.has(m)));

  // ---------- articles
  const arTr = byLang(raw.article_translations, 'article_id', (r) => ({
    slug: r.slug, title: r.title, excerpt: r.excerpt, html: r.body_html ?? '', minutes: r.reading_minutes, ...seo(r),
  }));
  const arCats = group(raw.article_categories, 'article_id');
  const arBooks = group([...raw.article_books].sort((a, b) => a.position - b.position), 'article_id');
  const articles: Article[] = raw.articles.map((a) => ({
    id: a.id, authorId: a.author_id, cover: med(a.cover_media_id), publishedAt: a.publish_at ?? a.created_at, updatedAt: a.updated_at,
    categoryIds: (arCats.get(a.id) ?? []).map((c) => c.category_id), bookIds: (arBooks.get(a.id) ?? []).map((c) => c.book_id),
    tr: arTr.get(a.id) ?? {},
  })).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // ---------- lists, homepage extras, shipping
  const lTr = byLang(raw.list_translations, 'list_id', (r) => r.name as string);
  const lItems = group([...raw.list_items].sort((a, b) => a.position - b.position), 'list_id');
  const lists = raw.lists.map((l) => ({
    key: l.key, mode: l.mode, rule: l.rule ?? {}, max: l.max_items, items: (lItems.get(l.id) ?? []).map((i) => i.format_id), names: lTr.get(l.id) ?? {},
  }));
  const instagram = [...raw.instagram_tiles].sort((a, b) => a.position - b.position)
    .map((t) => ({ media: med(t.media_id)!, url: t.post_url })).filter((t) => t.media);
  const regions = new Map(raw.shipping_regions.map((r) => [r.id, r]));
  const shipping = raw.shipping_options.filter((o) => o.active).sort((a, b) => a.sort - b.sort).map((o) => ({
    region: regions.get(o.region_id)?.name ?? '', countries: regions.get(o.region_id)?.countries ?? [], carrier: o.carrier, service: o.service_name,
    tracked: o.tracked, price: { EUR: o.price_eur_cents, USD: o.price_usd_cents }, min: o.delivery_min_days, max: o.delivery_max_days,
  }));

  return {
    source, builtAt: new Date(now).toISOString(), languages, enabledLanguages: enabled, textCompleteness, text, settings,
    authors, categories, collections, books, setFormats, articles, lists, instagram, shipping,
  };
}

let cache: Promise<SiteData> | null = null;
export function loadSiteData(): Promise<SiteData> {
  if (!cache) {
    cache = (async () => {
      if (env('OBELISK_DATA') === 'fixture') {
        const raw = JSON.parse(readFileSync(resolve(process.cwd(), env('FIXTURE_FILE') ?? 'fixtures/raw.json'), 'utf8'));
        raw.storage = env('FIXTURE_STORAGE') ?? 'http://localhost:4400/storage';
        return buildSiteData(raw, 'fixture');
      }
      return buildSiteData(await fetchRaw(), 'supabase');
    })();
  }
  return cache;
}
