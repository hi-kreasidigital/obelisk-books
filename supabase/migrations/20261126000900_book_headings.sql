-- Obelisk Books — Phase 2 — 0009: separate H2 / H3 fields per language on the book page (client request, 26 Nov 2026)
-- Book page: H1 = title, then subtitle; H2 = heading_h2 (falls back to "Description"), H3 = heading_h3; then the description paragraphs.
alter table public.book_translations
  add column heading_h2 text,
  add column heading_h3 text;
comment on column public.book_translations.heading_h2 is 'H2 above the description (optional; page falls back to the "Description" label)';
comment on column public.book_translations.heading_h3 is 'H3 under the H2 (optional)';
