-- Obelisk Books — Phase 2 — 0007: missing FK index
create index list_translations_lang on public.list_translations (lang);
