// Builds fixtures/raw.json + fixtures/storage/** — fake catalog data for local builds and Lighthouse runs
// (OBELISK_DATA=fixture). Same row shapes as the Supabase tables, so the real transform code is exercised.
// Not used by CI deploys. Run: node scripts/make-fixture.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { KEYS, SECTION } from './text-additions.mjs';

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const out = join(root, 'fixtures');
const seedSql = readFileSync(join(root, 'supabase/migrations/20261126000600_seed_website_text_v13.sql'), 'utf8');
const seed = [...seedSql.matchAll(/\$J\$(.*?)\$J\$/gs)].flatMap((m) => JSON.parse(m[1]));
const keys = [...seed.map((e) => ({ key: e[0], en: e[2] })), ...KEYS.map(([key, en]) => ({ key, en }))];

let n = 0;
const id = (p) => `${p}-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const day = (d) => iso(d).slice(0, 10);

async function image(bucket, path, w, h, bg, label) {
  const file = join(out, 'storage', bucket, path);
  mkdirSync(dirname(file), { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#1E2B2C"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="45%" font-family="Georgia,serif" font-size="${Math.round(w / 11)}" fill="#fff" text-anchor="middle">${label.split(' ').slice(0, 3).join(' ')}</text><text x="50%" y="55%" font-family="Georgia,serif" font-size="${Math.round(w / 11)}" fill="#fff" text-anchor="middle">${label.split(' ').slice(3, 6).join(' ')}</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(file);
  return { id: id('m'), bucket, path, mime: 'image/jpeg', width: w, height: h, bytes: null, alt: {}, caption: {}, blur_path: null };
}

const langs = [
  ['en', '', 'English', 'English', true, true, 1], ['fr', 'fr', 'French', 'Français', true, false, 2],
  ['de', 'de', 'German', 'Deutsch', true, false, 3], ['it', 'it', 'Italian', 'Italiano', true, false, 4],
  ['pt-BR', 'pt', 'Portuguese (Brazil)', 'Português (Brasil)', true, false, 5], ['es', 'es', 'Spanish', 'Español', true, false, 6],
  ['ja', 'ja', 'Japanese', '日本語', false, false, 8],
].map(([code, url_prefix, name_en, native_name, enabled, is_default, sort]) => ({ code, url_prefix, name_en, native_name, enabled, is_default, sort }));

// French is complete (fake "translations"), German half done → only EN + FR sites get built.
const text_keys = keys.map((k, i) => ({ key: k.key, removed_at: null, sort: i + 1, section_no: SECTION.no }));
const text_translations = [
  ...keys.map((k) => ({ key: k.key, lang: 'en', value: k.en })),
  ...keys.map((k) => ({ key: k.key, lang: 'fr', value: k.key === 'site.name' ? k.en : `FR · ${k.en}` })),
  ...keys.slice(0, 300).map((k) => ({ key: k.key, lang: 'de', value: `DE · ${k.en}` })),
];

const raw = { languages: langs, text_keys, text_translations, media: [] };
const T = (o) => Object.assign(o, {});
const cats = ['Spirituality', 'Awareness', 'New Science', 'Health'];
raw.categories = cats.map((c, i) => ({ id: id('c'), sort: i, image_media_id: null, status: 'published' }));
raw.category_translations = raw.categories.flatMap((c, i) => ['en', 'fr'].map((l) => ({
  category_id: c.id, lang: l, slug: (l === 'fr' ? 'fr-' : '') + cats[i].toLowerCase().replace(/ /g, '-'), name: (l === 'fr' ? 'FR ' : '') + cats[i],
  intro: `Books and articles on ${cats[i].toLowerCase()}: what readers will find here, written for search.`, complete: true, seo_title: null, seo_description: null,
})));

const authorNames = ['Suzanne Ward', 'Marcel Messing', 'Thea Terlouw', 'Karsten van Asdonk', 'Paolo Renati', 'Dr. Coen Vermeeren'];
raw.authors = [];
for (const [i, name] of authorNames.entries()) {
  const m = await image('media', `authors/a${i}.jpg`, 400, 400, ['#008E97', '#D89616', '#6b4e8f', '#3c7a3c'][i % 4], name);
  raw.media.push(m);
  raw.authors.push({ id: id('a'), name, sort_name: name.split(' ').at(-1), photo_media_id: m.id, website_url: i === 0 ? 'https://example.com' : null, status: 'published', sort: i });
}
raw.author_translations = raw.authors.flatMap((a) => ['en', 'fr'].map((l) => ({
  author_id: a.id, lang: l, slug: a.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''),
  bio: `${a.name} writes about consciousness and the changing world. A short biography of two or three sentences, entered per language in the dashboard.`,
  complete: true, seo_title: null, seo_description: null,
})));

raw.collections = [{ id: id('col'), sort: 0, cover_media_id: null, status: 'published' }];
raw.collection_translations = ['en', 'fr'].map((l) => ({ collection_id: raw.collections[0].id, lang: l, slug: 'matthews-books', name: "Matthew's Books",
  intro: 'Messages received by Suzanne Ward from her son Matthew. Best read in order, from the first book to the last.', complete: true, seo_title: null, seo_description: null }));

const titles = [
  ['Matthew, Tell Me about Heaven', 0, 0, 1], ['Revelations for a New Era', 0, 0, 2], ['Illuminations for a New Era', 0, 0, 3],
  ['Sinister Skies', 5, 2, null], ['Energy Abundance', 3, 2, null], ['Co-Science back to Life', 4, 2, null],
  ['The Hidden Dimension', 1, 1, null], ['Healing from Within', 2, 3, null], ['Awakening Together', 1, 1, null], ['The Coming Shift', 2, 0, null],
];
raw.books = []; raw.book_translations = []; raw.book_contributors = []; raw.book_categories = []; raw.formats = [];
for (const [i, [title, ai, ci, pos]] of titles.entries()) {
  const m = await image('covers', `b${i}.jpg`, 600, 852, ['#008E97', '#7a2f2f', '#2f4f7a', '#D89616', '#3c7a3c'][i % 5], title);
  raw.media.push(m);
  const b = { id: id('b'), internal_title: title, text_language: i === 6 ? 'nl' : 'en', publisher: 'Obelisk Books', collection_id: pos ? raw.collections[0].id : null,
    collection_position: pos, cover_media_id: m.id, tags: [], retailer_links: i === 3 ? [{ label: 'Bol.com', url: 'https://www.bol.com/' }] : [], status: 'published',
    publish_at: null, featured: i < 3, wix_slugs: [], updated_at: iso(-3) };
  raw.books.push(b);
  for (const l of i === 9 ? ['en'] : ['en', 'fr']) raw.book_translations.push({ book_id: b.id, lang: l, slug: title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''),
    title, subtitle: i === 3 ? 'The truth about chemtrails and geoengineering' : null,
    description: `Opening paragraph of the description of ${title}. It sets out what the book is about and why it matters to readers today.\n\nThe description continues with a second paragraph, adding detail about the author's research, the structure of the book and what readers will take away from it. Descriptions run 150–400 words.\n\nA third paragraph closes the description.`,
    heading_h2: i === 3 ? 'What is really happening in our skies?' : null, heading_h3: null, complete: true, seo_title: null, seo_description: null });
  raw.book_contributors.push({ book_id: b.id, author_id: raw.authors[ai].id, role: 'author', position: 1 });
  raw.book_categories.push({ book_id: b.id, category_id: raw.categories[ci].id });
  const rel = i === 2 ? day(-20) : i === 9 ? day(40) : day(-200 - i * 30);
  const fmt = (type, eur, extra = {}) => ({ id: id('f'), book_id: b.id, collection_id: null, type, bundle_of: null, isbn13: `97894646${String(10000 + i * 10 + (type === 'ebook' ? 1 : type === 'hardcover' ? 2 : 0)).slice(-5)}`,
    price_eur_cents: eur, price_usd_cents: Math.round(eur * 1.1), sale_price_eur_cents: null, sale_price_usd_cents: null, sale_starts_at: null, sale_ends_at: null,
    availability: i === 9 ? 'preorder' : 'available', release_date: rel, pages: 220 + i * 12, width_mm: type === 'ebook' ? null : 140, height_mm: type === 'ebook' ? null : 216,
    weight_g: type === 'ebook' ? null : 320, ...extra });
  raw.formats.push(fmt('paperback', 1999 - i * 50, i === 4 ? { sale_price_eur_cents: 1499, sale_price_usd_cents: 1649, sale_starts_at: iso(-5), sale_ends_at: iso(20) } : {}));
  if (i % 3 === 0) raw.formats.push(fmt('hardcover', 2999));
  if (i !== 7 && i !== 9) raw.formats.push(fmt('ebook', 749, { width_mm: null }));
}
// complete-collection paperback + ebook sets
raw.bundle_items = [];
for (const t of ['paperback', 'ebook']) {
  const set = { id: id('f'), book_id: null, collection_id: raw.collections[0].id, type: 'bundle', bundle_of: t, isbn13: null, price_eur_cents: t === 'ebook' ? 1899 : 5299,
    price_usd_cents: t === 'ebook' ? 2099 : 5799, sale_price_eur_cents: null, sale_price_usd_cents: null, sale_starts_at: null, sale_ends_at: null, availability: 'available',
    release_date: null, pages: null, width_mm: null, height_mm: null, weight_g: null };
  raw.formats.push(set);
  raw.books.filter((b) => b.collection_id).forEach((b, i) => raw.bundle_items.push({ bundle_format_id: set.id, member_format_id: raw.formats.find((f) => f.book_id === b.id && f.type === t).id, position: i + 1 }));
}
raw.preview_pages = [];
const eb = raw.formats.find((f) => f.type === 'ebook');
for (let p = 1; p <= 5; p++) {
  const m = await image('previews', `${eb.id}/${p}.jpg`, 800, 1200, '#bbbbbb', `Page ${p}`);
  raw.preview_pages.push({ format_id: eb.id, page_no: p, path: m.path, width: 800, height: 1200 });
}
raw.book_gallery = []; raw.related_books = []; raw.related_articles = [];

raw.articles = []; raw.article_translations = []; raw.article_categories = []; raw.article_books = [];
const artTitles = ['Unveiling the Downsides of Progress', 'Energy Abundance: Introduction to Free Energy', 'What the Messages Say about Heaven', 'Five Books to Start Your Journey',
  'Living with Awareness Every Day', 'Interview with Marcel Messing', 'New Science and the Field', 'Healing and the Heart', 'Reading Tips for Winter',
  'The Shift Explained', 'Questions Readers Ask', 'Behind the Scenes at Obelisk', 'A Short History of the Publisher', 'Sky Watching for Beginners'];
const sizes = [[1200, 900], [1200, 630], [800, 1000], [1000, 1000]];
for (const [i, title] of artTitles.entries()) {
  const [w, h] = sizes[i % 4];
  const m = await image('media', `articles/p${i}.jpg`, w, h, ['#006E75', '#D89616', '#4A4A4A'][i % 3], title);
  raw.media.push(m);
  const a = { id: id('p'), author_id: raw.authors[i % 6].id, cover_media_id: m.id, status: 'published', publish_at: iso(-i * 9 - 1), created_at: iso(-i * 9 - 2), updated_at: iso(-i * 9) };
  raw.articles.push(a);
  for (const l of i < 10 ? ['en', 'fr'] : ['en']) raw.article_translations.push({ article_id: a.id, lang: l, slug: title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''), title,
    excerpt: 'A two-line excerpt of the article that invites the reader to continue reading the full piece.',
    body_html: `<p>Intro paragraph of the article — rich text from the article editor, per language.</p><h2>A sub-heading</h2><p>Body text continues with <a href="https://example.com">a link</a> and more detail.</p><blockquote><p>A pull quote from the article.</p></blockquote><ul><li>First point</li><li>Second point</li></ul><p>Closing paragraph.</p>`,
    reading_minutes: 3 + (i % 5), complete: true, seo_title: null, seo_description: null });
  raw.article_categories.push({ article_id: a.id, category_id: raw.categories[i % 4].id });
  if (i === 1) raw.article_books.push({ article_id: a.id, book_id: raw.books[4].id, position: 1 });
}
raw.related_articles.push({ book_id: raw.books[4].id, article_id: raw.articles[1].id, position: 1 });

raw.lists = [['bestsellers', 'mixed', { source: 'sales', days: 90 }], ['new_releases', 'automatic', { days: 90 }], ['upcoming', 'automatic', { availability: 'preorder' }], ['on_sale', 'automatic', { on_sale: true }]]
  .map(([key, mode, rule]) => ({ id: id('l'), key, mode, rule, max_items: 10 }));
raw.list_translations = raw.lists.map((l) => ({ list_id: l.id, lang: 'en', name: l.key }));
raw.list_items = raw.formats.filter((f) => f.type === 'paperback').slice(3, 8).map((f, i) => ({ list_id: raw.lists[0].id, format_id: f.id, position: i + 1, pinned: true }));
raw.instagram_tiles = [];
for (let i = 0; i < 5; i++) {
  const m = await image('media', `instagram/i${i}.jpg`, 600, 750, ['#008E97', '#D89616'][i % 2], `Post ${i + 1}`);
  raw.media.push(m);
  raw.instagram_tiles.push({ id: id('i'), media_id: m.id, post_url: 'https://www.instagram.com/obelisk.books/', position: i });
}
raw.settings = [
  ['store.company', { name: 'Obelisk Media B.V.', brand: 'Obelisk Books', address: 'Zinkstraat 24, 4823 AD Breda, The Netherlands', coc: '69586489', vat: 'NL857929161B02' }],
  ['store.emails', { info: 'info@obeliskbooks.com', order: 'order@obeliskbooks.com' }],
  ['fulfilment.production_days', { default: { min: 5, max: 7 }, us_ca_au: { min: 7, max: 10 } }],
  ['ebooks.download_limit', 5], ['contact.reply_days', 2], ['homepage.featured_book', null], ['homepage.featured_ebook', null],
  ['social.instagram', { handle: '@obelisk.books', url: 'https://www.instagram.com/obelisk.books/' }],
].map(([key, value]) => ({ key, value }));
raw.shipping_regions = [{ id: id('r'), name: 'Europe', countries: ['NL', 'BE', 'DE', 'FR'] }];
raw.shipping_options = [{ id: id('s'), region_id: raw.shipping_regions[0].id, carrier: 'FedEx', service_name: 'Economy', tracked: true, price_eur_cents: 695, price_usd_cents: 795, delivery_min_days: 3, delivery_max_days: 5, active: true, sort: 0 }];
raw.lowest30 = Object.fromEntries(raw.formats.filter((f) => f.sale_price_eur_cents).map((f) => [f.id, { EUR: f.price_eur_cents, USD: f.price_usd_cents }]));

writeFileSync(join(out, 'raw.json'), JSON.stringify(raw));
console.log(`fixture: ${raw.books.length} books, ${raw.formats.length} formats, ${raw.articles.length} articles, ${raw.media.length} images, ${keys.length} text keys`);
