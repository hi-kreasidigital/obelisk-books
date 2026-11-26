-- Obelisk Books — Phase 3 — 0011: website text v1.4 (public-site additions, section 29) + publish_runs index
-- Source list: scripts/text-additions.mjs (also in docs/obelisk-website-text-en-v1.4.docx). English only; admins translate in the dashboard.
with k(key, value, note, sort) as (values
  ('home.hero.eyebrow', 'Publisher & bookstore since 2016', 'Small line above the homepage heading', 617),
  ('home.featured.badge', 'New release', 'Badge on the featured book in the homepage hero', 618),
  ('home.ebooks.step1.title', 'Read a preview', 'Homepage ebook section, step 01', 619),
  ('home.ebooks.step1.text', 'Open the first pages of any ebook before you buy.', null, 620),
  ('home.ebooks.step2.title', 'Pay securely', 'Step 02', 621),
  ('home.ebooks.step2.text', 'Card, PayPal, iDEAL, Apple Pay or Google Pay.', null, 622),
  ('home.ebooks.step3.title', 'Download', 'Step 03', 623),
  ('home.ebooks.step3.text', 'EPUB and PDF, also kept in your Ebook library.', null, 624),
  ('btn.view_book', 'View book', null, 625),
  ('btn.preorder', 'Pre-order', 'Button on pre-order books', 626),
  ('nav.main', 'Main menu', 'Screen-reader label of the main navigation', 627),
  ('nav.breadcrumb', 'Breadcrumb', 'Screen-reader label of the breadcrumb trail', 628),
  ('shop.showing', 'Showing {shown} of {total}', null, 629),
  ('filter.sets', 'Complete collection', 'Format filter option', 630),
  ('filter.available', 'Available now', 'Availability filter option', 631),
  ('filter.preorder', 'Pre-order', 'Availability filter option', 632),
  ('filter.active', 'Active filters:', null, 633),
  ('product.read_preview_free', 'First {count} pages, free', 'Under the "Read a preview" button', 634),
  ('product.start_now.title', 'Prefer to start reading now?', 'Ebook box on the print book page', 635),
  ('product.start_now.text', 'The ebook comes in EPUB and PDF, ready to download right after payment. Read the first pages free.', null, 636),
  ('product.read_first', 'Read the first pages', 'Heading of the preview strip on the ebook page', 637),
  ('collection.add', 'Add the complete collection to cart', null, 638),
  ('collection.set_intro', 'All {count} books in reading order, as one set in one format.', null, 639),
  ('collection.set.paperback', 'Paperback set', null, 640),
  ('collection.set.hardcover', 'Hardcover set', null, 641),
  ('collection.set.ebook', 'Ebook set', null, 642),
  ('collection.set_unavailable', 'Not available for every book in this collection', 'Greyed-out set option', 643),
  ('articles.latest', 'Latest', 'Label on the newest article', 644),
  ('pagination.label', 'Pages', 'Screen-reader label of the page numbers', 645),
  ('pagination.prev', 'Previous page', null, 646),
  ('pagination.next', 'Next page', null, 647),
  ('pagination.page', 'Page {number}', 'Added to the page title on page 2, 3 …', 648),
  ('search.title', 'Search', 'Search results page heading without a search word', 649),
  ('search.results', '{count} results for “{query}”', null, 650),
  ('search.none', 'No results for “{query}”', null, 651),
  ('search.none_text', 'Try another word, or browse:', null, 652),
  ('search.books', 'Books', 'Group heading on the search results page', 653),
  ('search.authors', 'Authors', null, 654),
  ('search.articles', 'Articles', null, 655),
  ('search.suggestions', 'Suggestions', 'Screen-reader label of the header search suggestions', 656),
  ('faq.still', 'Still have a question? We''re happy to help.', null, 657),
  ('faq.contact_cta', 'Contact us', null, 658),
  ('help.label', 'Help', 'Side menu of the help pages', 659),
  ('legal.toc', 'On this page', 'Table of contents on legal pages', 660),
  ('legal.pending', 'This text is being finalised and will be published here soon.', 'Shown until the legal text is entered (Phase 7)', 661),
  ('footer.newsletter', 'Newsletter', 'Footer link to the newsletter form', 662),
  ('state.coming_soon', 'This part of the store opens soon.', 'Temporary note on cart, checkout and account pages until Phases 4–5', 663)
), ins as (
  insert into public.text_keys (key, section_no, section_title, note, placeholders, sort)
  select key, 29, 'Public site — Phase 3 additions (v1.4)', note, public.text_placeholders(value), sort from k
  on conflict (key) do nothing
  returning key
)
insert into public.text_translations (key, lang, value)
select k.key, 'en', k.value from k join ins using (key)
on conflict (key, lang) do nothing;

create index if not exists publish_runs_created on public.publish_runs (created_at desc);
