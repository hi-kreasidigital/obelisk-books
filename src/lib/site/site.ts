// Helpers shared by every public page: languages, URLs, text, money, dates, product cards, shelves.
import { loadSiteData } from './load';
import type { Article, Author, Book, Category, Collection, Format, Lang, LangCode, SiteData } from './types';

export const SITE_URL = 'https://www.obeliskbooks.com';
/** Indexing stays off until Launch (Phase 9): PUBLIC_SITE_INDEXING=true opens it. */
export const INDEXING = (process.env.PUBLIC_SITE_INDEXING ?? import.meta.env.PUBLIC_SITE_INDEXING) === 'true';

export interface Site extends SiteData {
  book: Map<string, Book>;
  format: Map<string, Format>;
  author: Map<string, Author>;
  category: Map<string, Category>;
  collection: Map<string, Collection>;
  article: Map<string, Article>;
  bookOfFormat: (f: Format) => Book | undefined;
  lang: (code: LangCode) => Lang;
}

let site: Promise<Site> | null = null;
export function getSite(): Promise<Site> {
  site ??= loadSiteData().then((d) => {
    const formats = [...d.books.flatMap((b) => b.formats), ...d.setFormats];
    const s: Site = {
      ...d,
      book: new Map(d.books.map((b) => [b.id, b])),
      format: new Map(formats.map((f) => [f.id, f])),
      author: new Map(d.authors.map((a) => [a.id, a])),
      category: new Map(d.categories.map((c) => [c.id, c])),
      collection: new Map(d.collections.map((c) => [c.id, c])),
      article: new Map(d.articles.map((a) => [a.id, a])),
      bookOfFormat: (f) => (f.bookId ? s.book.get(f.bookId) : undefined),
      lang: (code) => d.languages.find((l) => l.code === code) ?? d.languages[0],
    };
    return s;
  });
  return site;
}

// ---------------------------------------------------------------- languages & URLs
export const langParam = (l: Lang) => (l.prefix === '' ? undefined : l.prefix);
export const langFromParam = (s: Site, p: string | undefined) => s.languages.find((l) => l.prefix === (p ?? ''))!;

/** Static paths for one page per site language. */
export async function langPaths() {
  const s = await getSite();
  return s.languages.map((l) => ({ params: { lang: langParam(l) }, props: { lang: l.code } }));
}

export const href = (lang: Lang, path = '/') => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang.prefix ? `/${lang.prefix}${p === '/' ? '' : p}` : p;
};
export const absolute = (path: string) => SITE_URL + path;

export const LOCALES: Record<string, string> = { en: 'en-IE', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', 'pt-BR': 'pt-BR', es: 'es-ES', hi: 'hi-IN', ja: 'ja-JP', 'zh-Hans': 'zh-CN', ko: 'ko-KR' };
export const OG_LOCALES: Record<string, string> = { en: 'en_GB', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', 'pt-BR': 'pt_BR', es: 'es_ES' };
export const locale = (code: LangCode) => LOCALES[code] ?? code;

// ---------------------------------------------------------------- text
export type T = (key: string, vars?: Record<string, string | number>) => string;
export function translator(s: Site, code: LangCode): T {
  const dict = s.text[code] ?? {};
  const en = s.text.en ?? {};
  return (key, vars) => {
    // English pages fall back to the key name (visible in review); other languages are only built when complete.
    let v = dict[key] ?? en[key] ?? key;
    if (vars) v = v.replace(/\{([a-z_]+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    return v;
  };
}

// ---------------------------------------------------------------- money & dates
export const money = (cents: number, currency: 'EUR' | 'USD', code: LangCode) =>
  new Intl.NumberFormat(locale(code), { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
export const date = (iso: string | null | undefined, code: LangCode) =>
  iso ? new Intl.DateTimeFormat(locale(code), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(new Date(iso)) : '';
export const languageName = (bookLang: string, code: LangCode) => {
  try { return new Intl.DisplayNames([locale(code)], { type: 'language' }).of(bookLang) ?? bookLang; } catch { return bookLang; }
};

// ---------------------------------------------------------------- entity helpers
export const isPrint = (f: Format) => f.type === 'paperback' || f.type === 'hardcover';
export const printFormats = (b: Book) => b.formats.filter(isPrint);
export const ebookFormat = (b: Book) => b.formats.find((f) => f.type === 'ebook');

export const authorNames = (s: Site, ids: string[], t: T) => {
  const names = ids.map((id) => s.author.get(id)?.name).filter(Boolean) as string[];
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${t('product.and')} ${names.at(-1)}`;
};

export const bookUrl = (lang: Lang, b: Book) => href(lang, `/books/${b.tr[lang.code].slug}`);
export const ebookUrl = (lang: Lang, b: Book) => href(lang, `/ebooks/${b.tr[lang.code].slug}`);
export const formatUrl = (s: Site, lang: Lang, f: Format) => {
  if (f.type === 'bundle') { const c = s.collection.get(f.collectionId!); return c?.tr[lang.code] ? href(lang, `/collections/${c.tr[lang.code].slug}`) : null; }
  const b = s.bookOfFormat(f);
  if (!b?.tr[lang.code]) return null;
  return f.type === 'ebook' ? ebookUrl(lang, b) : bookUrl(lang, b);
};

export const booksIn = (s: Site, code: LangCode) => s.books.filter((b) => b.tr[code]);
export const authorsIn = (s: Site, code: LangCode) => s.authors.filter((a) => a.tr[code]);
export const categoriesIn = (s: Site, code: LangCode) => s.categories.filter((c) => c.tr[code]);
export const collectionsIn = (s: Site, code: LangCode) => s.collections.filter((c) => c.tr[code] && collectionBooks(s, c.id, code).length > 0);
export const articlesIn = (s: Site, code: LangCode) => s.articles.filter((a) => a.tr[code]);
export const collectionBooks = (s: Site, id: string, code: LangCode) =>
  s.books.filter((b) => b.collectionId === id && b.tr[code]).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
export const collectionSets = (s: Site, id: string) => s.setFormats.filter((f) => f.collectionId === id);

/** Sum of the separate member prices of a set (for "Save €x"). */
export const setSavings = (s: Site, set: Format, cur: 'EUR' | 'USD') => {
  const sum = set.members.reduce((t, m) => t + (s.format.get(m)?.price[cur] ?? 0), 0);
  return { separate: sum, save: Math.max(0, sum - set.price[cur]) };
};

// ---------------------------------------------------------------- product cards
export interface Card {
  formatId: string; href: string; title: string; author: string; cover: Book['cover']; covers: NonNullable<Book['cover']>[];
  type: Format['type']; formatLabel: string; price: Format['price']; regular: Format['regular']; onSale: boolean;
  lowest30: Format['lowest30']; preorder: string | null; outOfPrint: boolean; save: number | null;
  categoryIds: string[]; collectionId: string | null; authorIds: string[]; releaseDate: string | null; sortTitle: string;
}
export function card(s: Site, lang: Lang, f: Format, t: T): Card | null {
  const url = formatUrl(s, lang, f);
  if (!url) return null;
  if (f.type === 'bundle') {
    const c = s.collection.get(f.collectionId!)!;
    const books = f.members.map((m) => s.bookOfFormat(s.format.get(m)!)).filter(Boolean) as Book[];
    const authors = [...new Set(books.flatMap((b) => b.authors))];
    return {
      formatId: f.id, href: url, title: c.tr[lang.code].name, author: authorNames(s, authors, t), cover: books[0]?.cover ?? c.cover,
      covers: books.map((b) => b.cover).filter(Boolean) as any, type: f.type, formatLabel: t(`format.${f.bundleOf}`) + ' · ' + t('format.collection'),
      price: f.price, regular: f.regular, onSale: false, lowest30: {}, preorder: null, outOfPrint: false, save: setSavings(s, f, 'EUR').save || null,
      categoryIds: [...new Set(books.flatMap((b) => b.categoryIds))], collectionId: f.collectionId, authorIds: authors,
      releaseDate: books.map((b) => b.formats.find((x) => x.type === f.bundleOf)?.releaseDate ?? '').sort().at(-1) || null,
      sortTitle: c.tr[lang.code].name,
    };
  }
  const b = s.bookOfFormat(f)!;
  const tr = b.tr[lang.code];
  return {
    formatId: f.id, href: url + (f.type === 'hardcover' ? '#hardcover' : ''), title: tr.title, author: authorNames(s, b.authors, t),
    cover: b.cover, covers: b.cover ? [b.cover] : [], type: f.type, formatLabel: t(`format.${f.type}`),
    price: f.price, regular: f.regular, onSale: f.onSale, lowest30: f.lowest30,
    preorder: f.availability === 'preorder' ? f.releaseDate : null, outOfPrint: f.availability === 'out_of_print', save: null,
    categoryIds: b.categoryIds, collectionId: b.collectionId, authorIds: b.authors, releaseDate: f.releaseDate, sortTitle: tr.title,
  };
}

/** Cards for listing pages: one print card per book (cheapest print format), one ebook card, plus collection sets. */
export function listingCards(s: Site, lang: Lang, t: T, which: 'all' | 'print' | 'ebook' | 'sets' = 'all', books = booksIn(s, lang.code)) {
  const out: Card[] = [];
  for (const b of books) {
    if (which === 'all' || which === 'print') {
      const p = printFormats(b).sort((x, y) => x.price.EUR - y.price.EUR)[0];
      if (p) { const c = card(s, lang, p, t); if (c) out.push(c); }
    }
    if (which === 'all' || which === 'ebook') {
      const e = ebookFormat(b);
      if (e) { const c = card(s, lang, e, t); if (c) out.push(c); }
    }
  }
  if (which === 'all' || which === 'sets') {
    const ids = new Set(books.map((b) => b.collectionId));
    for (const f of s.setFormats) if (ids.has(f.collectionId)) { const c = card(s, lang, f, t); if (c) out.push(c); }
  }
  return out;
}

// ---------------------------------------------------------------- shelves (lists)
const DAY = 86_400_000;
export function shelf(s: Site, key: string, lang: Lang, t: T, max?: number): Card[] {
  const list = s.lists.find((l) => l.key === key);
  const limit = max ?? list?.max ?? 10;
  const now = Date.parse(s.builtAt);
  const all = [...s.books.flatMap((b) => b.formats)];
  const pinned = (list?.items ?? []).map((id) => s.format.get(id)).filter(Boolean) as Format[];
  let auto: Format[] = [];
  if (key === 'new_releases') {
    const days = Number(list?.rule?.days ?? 90);
    auto = all.filter((f) => f.releaseDate && Date.parse(f.releaseDate) <= now && Date.parse(f.releaseDate) > now - days * DAY && f.availability === 'available')
      .sort((a, b) => b.releaseDate!.localeCompare(a.releaseDate!));
  } else if (key === 'upcoming') {
    auto = all.filter((f) => f.availability === 'preorder').sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''));
  } else if (key === 'on_sale') {
    auto = all.filter((f) => f.onSale);
  } else if (key === 'bestsellers') {
    // Sales ranking needs order data (Phase 4/5). Until then: pinned items, then featured books' print editions.
    auto = s.books.filter((b) => b.featured).map((b) => printFormats(b)[0] ?? b.formats[0]);
  }
  const seen = new Set<string>();
  const seenBooks = new Set<string>();
  const out: Card[] = [];
  for (const f of list?.mode === 'automatic' ? auto : [...pinned, ...auto]) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    // automatic picks show each book once (pinned items are shown as chosen)
    if (!pinned.includes(f) && f.bookId) { if (seenBooks.has(f.bookId)) continue; seenBooks.add(f.bookId); }
    const c = card(s, lang, f, t);
    if (c) out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------- misc
export const stripHtml = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export const clip = (text: string, n = 155) => (text.length <= n ? text : text.slice(0, text.lastIndexOf(' ', n - 1) > 60 ? text.lastIndexOf(' ', n - 1) : n - 1).trimEnd() + '…');
/** Plain-text description → paragraphs (blank line or newline separated). */
export const paragraphs = (text: string | null | undefined) => (text ?? '').split(/\n\s*\n|\r?\n/).map((p) => p.trim()).filter(Boolean);
export const productionDays = (s: Site) => {
  const p = s.settings['fulfilment.production_days']?.default;
  return p ? `${p.min}–${p.max}` : '5–7';
};

/** language code → path, for every site language where fn returns a path */
export function alternates(s: Site, fn: (l: Lang) => string | null | undefined) {
  const r: Record<string, string> = {};
  for (const l of s.languages) { const p = fn(l); if (p) r[l.code] = p; }
  return r;
}
export const staticAlternates = (s: Site, path: string) => alternates(s, (l) => href(l, path));

export function organization(s: Site) {
  const c = s.settings['store.company'] ?? {};
  const e = s.settings['store.emails'] ?? {};
  const ig = s.settings['social.instagram']?.url;
  return {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE_URL}/#organization`,
    name: c.brand ?? 'Obelisk Books', legalName: c.name ?? 'Obelisk Media B.V.', url: `${SITE_URL}/`, logo: `${SITE_URL}/logo-round-512.png`,
    email: e.info, vatID: c.vat, foundingDate: '2016',
    address: { '@type': 'PostalAddress', streetAddress: 'Zinkstraat 24', postalCode: '4823 AD', addressLocality: 'Breda', addressCountry: 'NL' },
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer service', email: e.info }, { '@type': 'ContactPoint', contactType: 'orders', email: e.order }].filter((x) => x.email),
    sameAs: [ig].filter(Boolean),
  };
}

/** Shipping + returns facts for Offer structured data (Google merchant listings). */
export function offerExtras(s: Site, print: boolean) {
  const returns = {
    '@type': 'MerchantReturnPolicy', applicableCountry: 'NL',
    returnPolicyCategory: print ? 'https://schema.org/MerchantReturnFiniteReturnWindow' : 'https://schema.org/MerchantReturnNotPermitted',
    ...(print ? { merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnShippingFees' } : {}),
    merchantReturnLink: `${SITE_URL}/returns`,
  };
  const p = s.settings['fulfilment.production_days']?.default ?? { min: 5, max: 7 };
  const shipping = print ? s.shipping.filter((o) => o.tracked).slice(0, 10).map((o) => ({
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: (o.price.EUR / 100).toFixed(2), currency: 'EUR' },
    shippingDestination: o.countries.slice(0, 30).map((c) => ({ '@type': 'DefinedRegion', addressCountry: c })),
    deliveryTime: { '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: p.min, maxValue: p.max, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: o.min, maxValue: o.max, unitCode: 'DAY' } },
  })) : [{
    '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'EUR' },
    deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' } },
  }];
  return { hasMerchantReturnPolicy: returns, ...(shipping.length ? { shippingDetails: shipping } : {}) };
}

export const availabilityUrl = (f: Format) =>
  `https://schema.org/${f.availability === 'preorder' ? 'PreOrder' : f.availability === 'out_of_print' ? 'Discontinued' : 'InStock'}`;

/** Up to n related books: chosen in the dashboard, empty slots filled from the same collection, then the same topic. */
export function relatedBooks(s: Site, b: Book, code: LangCode, n = 3) {
  const out: Book[] = [];
  const add = (x?: Book) => { if (x && x.id !== b.id && x.tr[code] && !out.includes(x) && out.length < n) out.push(x); };
  b.relatedBookIds.forEach((id) => add(s.book.get(id)));
  if (b.collectionId) s.books.filter((x) => x.collectionId === b.collectionId).forEach(add);
  s.books.filter((x) => x.categoryIds.some((c) => b.categoryIds.includes(c))).forEach(add);
  return out;
}
/** Up to n related articles: chosen, then articles that mention the book, then the same topic. */
export function relatedArticles(s: Site, b: Book, code: LangCode, n = 3) {
  const out: Article[] = [];
  const add = (x?: Article) => { if (x && x.tr[code] && !out.includes(x) && out.length < n) out.push(x); };
  b.relatedArticleIds.forEach((id) => add(s.article.get(id)));
  s.articles.filter((a) => a.bookIds.includes(b.id)).forEach(add);
  s.articles.filter((a) => a.categoryIds.some((c) => b.categoryIds.includes(c))).forEach(add);
  return out;
}
export const bookPaths = async (kind: 'print' | 'ebook') => {
  const s = await getSite();
  return s.languages.flatMap((l) => booksIn(s, l.code)
    .filter((b) => (kind === 'print' ? printFormats(b).length > 0 : !!ebookFormat(b)))
    .map((b) => ({ params: { lang: langParam(l), slug: b.tr[l.code].slug }, props: { lang: l.code, id: b.id } })));
};

/** Static paths for an entity type with per-language slugs. */
export async function entityPaths<E extends { id: string; tr: Record<string, { slug: string }> }>(pick: (s: Site, code: LangCode) => E[]) {
  const s = await getSite();
  return s.languages.flatMap((l) => pick(s, l.code).map((e) => ({ params: { lang: langParam(l), slug: e.tr[l.code].slug }, props: { lang: l.code, id: e.id } })));
}
export const topicOf = (s: Site, ids: string[], code: LangCode) => ids.map((id) => s.category.get(id)?.tr[code]?.name).find(Boolean);

/** Remove the sentence holding a placeholder whose value isn't configured yet (e.g. a free-shipping threshold). */
export const withoutSentence = (text: string, placeholder: string) =>
  text.includes(`{${placeholder}}`) ? text.split(/(?<=[.!?])\s+/).filter((x) => !x.includes(`{${placeholder}}`)).join(' ') : text;
/** Free-shipping threshold from settings (Phase 4 automatic discount), formatted, or null. */
export const freeShipping = (s: Site, code: LangCode) => {
  const v = s.settings['shipping.free_threshold'];
  return v?.EUR ? money(v.EUR, 'EUR', code) : null;
};

// ---------------------------------------------------------------- indexable pages (sitemaps)
export interface PageEntry { urls: Record<LangCode, string>; lastmod?: string; images?: Record<LangCode, string[]> }
export function indexablePages(s: Site): PageEntry[] {
  const out: PageEntry[] = [];
  const st = (p: string, lastmod?: string) => out.push({ urls: staticAlternates(s, p), lastmod });
  const newest = (xs: string[]) => xs.filter(Boolean).sort().at(-1);
  const lastBook = newest(s.books.map((b) => b.updatedAt));
  ['/', '/shop', '/books', '/ebooks', '/collections', '/categories', '/authors'].forEach((p) => st(p, lastBook));
  st('/articles', newest(s.articles.map((a) => a.updatedAt)));
  ['/about', '/contact', '/faq', '/shipping', '/returns', '/payment-methods'].forEach((p) => st(p));
  for (const k of ['privacy', 'terms', 'withdrawal'] as const) {
    const doc = s.settings[`legal.${k}`];
    const path = k === 'withdrawal' ? '/right-of-withdrawal' : `/${k}`;
    const urls = alternates(s, (l) => (doc?.[l.code]?.html ? href(l, path) : null));
    if (Object.keys(urls).length) out.push({ urls });
  }
  for (const l of s.languages) {
    const pages = Math.ceil(articlesIn(s, l.code).length / 12);
    for (let n = 2; n <= pages; n++) out.push({ urls: { [l.code]: href(l, `/articles/page/${n}`) } });
  }
  for (const b of s.books) {
    const img = (l: Lang) => (b.cover ? [b.cover.url] : []);
    if (printFormats(b).length) out.push({ urls: alternates(s, (l) => (b.tr[l.code] ? bookUrl(l, b) : null)), lastmod: b.updatedAt, images: Object.fromEntries(s.languages.map((l) => [l.code, img(l)])) });
    if (ebookFormat(b)) out.push({ urls: alternates(s, (l) => (b.tr[l.code] ? ebookUrl(l, b) : null)), lastmod: b.updatedAt, images: Object.fromEntries(s.languages.map((l) => [l.code, img(l)])) });
  }
  for (const c of s.collections) out.push({ urls: alternates(s, (l) => (collectionsIn(s, l.code).includes(c) ? href(l, `/collections/${c.tr[l.code].slug}`) : null)) });
  for (const c of s.categories) out.push({ urls: alternates(s, (l) => (c.tr[l.code] ? href(l, `/categories/${c.tr[l.code].slug}`) : null)) });
  for (const a of s.authors) out.push({ urls: alternates(s, (l) => (a.tr[l.code] ? href(l, `/authors/${a.tr[l.code].slug}`) : null)) });
  for (const a of s.articles) out.push({ urls: alternates(s, (l) => (a.tr[l.code] ? href(l, `/articles/${a.tr[l.code].slug}`) : null)), lastmod: a.updatedAt,
    images: Object.fromEntries(s.languages.map((l) => [l.code, a.cover ? [a.cover.url] : []])) });
  return out.filter((p) => Object.keys(p.urls).length > 0);
}
export const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
