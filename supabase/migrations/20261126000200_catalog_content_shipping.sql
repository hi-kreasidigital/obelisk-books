-- Obelisk Books — Phase 2 — 0002: media, catalog, collections & sets, lists, articles, settings, shipping

create type public.content_status as enum ('draft', 'published', 'hidden');
create type public.format_type    as enum ('paperback', 'hardcover', 'ebook', 'bundle');
create type public.set_type       as enum ('paperback', 'hardcover', 'ebook');
create type public.availability   as enum ('available', 'preorder', 'out_of_print', 'hidden');
create type public.contributor_role as enum ('author', 'translator', 'editor', 'illustrator');
create type public.list_mode      as enum ('manual', 'automatic', 'mixed');

-- published and not scheduled in the future
create or replace function public.is_live(s public.content_status, publish_at timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select s = 'published' and (publish_at is null or publish_at <= now());
$$;

create or replace function public.lang_enabled(code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.languages l where l.code = lang_enabled.code and l.enabled);
$$;

-- ---------------------------------------------------------------- media
create table public.media (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null check (bucket in ('covers', 'previews', 'media')),
  path       text not null,
  mime       text not null,
  width      int,
  height     int,
  bytes      bigint,
  alt        jsonb not null default '{}',   -- {"en": "...", "fr": "..."}
  caption    jsonb not null default '{}',
  blur_path  text,                          -- blurred copy for 4:3 blog thumbnails
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (bucket, path)
);

-- ---------------------------------------------------------------- authors
create table public.authors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  sort_name      text not null,
  photo_media_id uuid references public.media (id) on delete set null,
  website_url    text,
  status         public.content_status not null default 'draft',
  sort           int not null default 0,
  wix_slug       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create table public.author_translations (
  author_id       uuid not null references public.authors (id) on delete cascade,
  lang            text not null references public.languages (code) on update cascade,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  bio             text,
  seo_title       text,
  seo_description text,
  complete        boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  primary key (author_id, lang),
  unique (lang, slug)
);

-- ---------------------------------------------------------------- categories
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  sort           int not null default 0,
  image_media_id uuid references public.media (id) on delete set null,
  status         public.content_status not null default 'draft',
  wix_slug       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create table public.category_translations (
  category_id     uuid not null references public.categories (id) on delete cascade,
  lang            text not null references public.languages (code) on update cascade,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null,
  intro           text,
  seo_title       text,
  seo_description text,
  complete        boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  primary key (category_id, lang),
  unique (lang, slug)
);

-- ---------------------------------------------------------------- collections
create table public.collections (
  id             uuid primary key default gen_random_uuid(),
  sort           int not null default 0,
  cover_media_id uuid references public.media (id) on delete set null,
  status         public.content_status not null default 'draft',
  wix_slug       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create table public.collection_translations (
  collection_id   uuid not null references public.collections (id) on delete cascade,
  lang            text not null references public.languages (code) on update cascade,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null,
  intro           text,
  seo_title       text,
  seo_description text,
  complete        boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  primary key (collection_id, lang),
  unique (lang, slug)
);

-- ---------------------------------------------------------------- books
create table public.books (
  id                  uuid primary key default gen_random_uuid(),
  internal_title      text not null,
  text_language       text not null default 'en',      -- language the book itself is written in (any code, e.g. nl)
  publication_date    date,
  publisher           text not null default 'Obelisk Books',
  collection_id       uuid references public.collections (id) on delete set null,
  collection_position int check (collection_position > 0),
  cover_media_id      uuid references public.media (id) on delete set null,
  tags                text[] not null default '{}',
  retailer_links      jsonb not null default '[]',      -- [{"label":"Bol.com","url":"https://..."}] — no Kindle links
  status              public.content_status not null default 'draft',
  publish_at          timestamptz,
  featured            boolean not null default false,
  wix_slugs           text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid,
  check ((collection_id is null) = (collection_position is null))
);
create unique index books_collection_position on public.books (collection_id, collection_position) where collection_id is not null;

create table public.book_translations (
  book_id         uuid not null references public.books (id) on delete cascade,
  lang            text not null references public.languages (code) on update cascade,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null,
  subtitle        text,
  description     text,
  seo_title       text,
  seo_description text,
  complete        boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  primary key (book_id, lang),
  unique (lang, slug)
);

create table public.book_contributors (
  book_id   uuid not null references public.books (id) on delete cascade,
  author_id uuid not null references public.authors (id) on delete restrict,
  role      public.contributor_role not null default 'author',
  position  int not null default 1,
  primary key (book_id, author_id, role)
);
create index book_contributors_author on public.book_contributors (author_id);

create table public.book_categories (
  book_id     uuid not null references public.books (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (book_id, category_id)
);
create index book_categories_category on public.book_categories (category_id);

create table public.book_gallery (
  book_id  uuid not null references public.books (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  position int not null,
  primary key (book_id, media_id)
);
create index book_gallery_media on public.book_gallery (media_id);

create table public.related_books (
  book_id         uuid not null references public.books (id) on delete cascade,
  related_book_id uuid not null references public.books (id) on delete cascade,
  position        int not null check (position between 1 and 3),
  primary key (book_id, position),
  unique (book_id, related_book_id),
  check (book_id <> related_book_id)
);
create index related_books_related on public.related_books (related_book_id);

-- ---------------------------------------------------------------- formats (incl. complete-collection sets)
create table public.formats (
  id                   uuid primary key default gen_random_uuid(),
  book_id              uuid references public.books (id) on delete cascade,
  collection_id        uuid references public.collections (id) on delete cascade,
  type                 public.format_type not null,
  bundle_of            public.set_type,
  isbn13               text unique check (isbn13 ~ '^97[89][0-9]{10}$'),
  price_eur_cents      int not null check (price_eur_cents >= 0),
  price_usd_cents      int not null check (price_usd_cents >= 0),
  sale_price_eur_cents int check (sale_price_eur_cents >= 0),
  sale_price_usd_cents int check (sale_price_usd_cents >= 0),
  sale_starts_at       timestamptz,
  sale_ends_at         timestamptz,
  availability         public.availability not null default 'available',
  release_date         date,
  pages                int check (pages > 0),
  width_mm             numeric(6,1),
  height_mm            numeric(6,1),
  weight_g             int,
  bookvault_sku        text,                     -- Bookvault SKU / title ID (print) — key for API orders in Phase 8
  stripe_tax_code      text,
  ebook_epub_path      text,                     -- object path in private bucket 'ebooks'
  ebook_pdf_path       text,
  preview_source       text check (preview_source in ('pdf', 'epub')),
  preview_page_from    int not null default 1 check (preview_page_from > 0),
  preview_page_count   int not null default 5 check (preview_page_count between 1 and 10),
  preview_generated_at timestamptz,
  sort                 int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by           uuid,
  check ((type = 'bundle') = (book_id is null)),
  check ((type = 'bundle') = (collection_id is not null and bundle_of is not null)),
  check (type in ('paperback', 'hardcover') or bookvault_sku is null),
  check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at)
);
create unique index formats_one_per_type on public.formats (book_id, type) where book_id is not null;
create unique index formats_one_set_per_type on public.formats (collection_id, bundle_of) where type = 'bundle';
create unique index formats_bookvault_sku on public.formats (bookvault_sku) where bookvault_sku is not null;

create table public.bundle_items (
  bundle_format_id uuid not null references public.formats (id) on delete cascade,
  member_format_id uuid not null references public.formats (id) on delete restrict,
  position         int not null,
  primary key (bundle_format_id, member_format_id),
  unique (bundle_format_id, position)
);
create index bundle_items_member on public.bundle_items (member_format_id);

-- members of a set: same format type as the set, books from the set's collection
create or replace function public.check_bundle_item()
returns trigger language plpgsql set search_path = '' as $$
declare
  b public.formats;
  m public.formats;
  m_collection uuid;
begin
  select * into b from public.formats where id = new.bundle_format_id;
  select * into m from public.formats where id = new.member_format_id;
  if b.type <> 'bundle' then
    raise exception 'Format % is not a complete-collection set', b.id;
  end if;
  if m.type::text <> b.bundle_of::text then
    raise exception 'A % set can only contain % formats (got %)', b.bundle_of, b.bundle_of, m.type;
  end if;
  select collection_id into m_collection from public.books where id = m.book_id;
  if m_collection is distinct from b.collection_id then
    raise exception 'Every book in the set must belong to the set''s collection';
  end if;
  return new;
end $$;
create trigger bundle_items_check before insert or update on public.bundle_items
  for each row execute function public.check_bundle_item();

create table public.preview_pages (
  format_id uuid not null references public.formats (id) on delete cascade,
  page_no   int  not null check (page_no between 1 and 10),
  path      text not null,                   -- object path in bucket 'previews' (WebP, 2x)
  width     int,
  height    int,
  primary key (format_id, page_no)
);

-- ---------------------------------------------------------------- price history (EU "lowest price in the last 30 days")
create table public.price_history (
  id                   bigint generated always as identity primary key,
  format_id            uuid not null references public.formats (id) on delete cascade,
  price_eur_cents      int not null,
  price_usd_cents      int not null,
  sale_price_eur_cents int,
  sale_price_usd_cents int,
  sale_starts_at       timestamptz,
  sale_ends_at         timestamptz,
  valid_from           timestamptz not null default now(),
  valid_to             timestamptz
);
create index price_history_format on public.price_history (format_id, valid_from);

create or replace function public.log_price_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.price_eur_cents, new.price_usd_cents, new.sale_price_eur_cents, new.sale_price_usd_cents,
                           new.sale_starts_at, new.sale_ends_at)
       is not distinct from (old.price_eur_cents, old.price_usd_cents, old.sale_price_eur_cents, old.sale_price_usd_cents,
                             old.sale_starts_at, old.sale_ends_at) then
    return new;
  end if;
  update public.price_history set valid_to = now() where format_id = new.id and valid_to is null;
  insert into public.price_history (format_id, price_eur_cents, price_usd_cents, sale_price_eur_cents,
                                    sale_price_usd_cents, sale_starts_at, sale_ends_at)
  values (new.id, new.price_eur_cents, new.price_usd_cents, new.sale_price_eur_cents,
          new.sale_price_usd_cents, new.sale_starts_at, new.sale_ends_at);
  return new;
end $$;
create trigger formats_price_history after insert or update on public.formats
  for each row execute function public.log_price_history();

-- price actually charged at a moment
create or replace function public.current_price_cents(f uuid, currency text, at timestamptz default now())
returns int language sql stable set search_path = '' as $$
  select case
    when (case when currency = 'USD' then sale_price_usd_cents else sale_price_eur_cents end) is not null
         and (sale_starts_at is null or sale_starts_at <= at)
         and (sale_ends_at is null or sale_ends_at > at)
      then case when currency = 'USD' then sale_price_usd_cents else sale_price_eur_cents end
    else case when currency = 'USD' then price_usd_cents else price_eur_cents end
  end
  from public.formats where id = f;
$$;

-- lowest price charged in the 30 days before `before` (pass the sale start date)
create or replace function public.lowest_price_30d(f uuid, currency text, before timestamptz default now())
returns int language sql stable set search_path = '' as $$
  with seg as (
    select greatest(h.valid_from, before - interval '30 days') as s,
           least(coalesce(h.valid_to, 'infinity'::timestamptz), before) as e,
           case when currency = 'USD' then h.price_usd_cents else h.price_eur_cents end as regular,
           case when currency = 'USD' then h.sale_price_usd_cents else h.sale_price_eur_cents end as sale,
           coalesce(h.sale_starts_at, '-infinity'::timestamptz) as ss,
           coalesce(h.sale_ends_at, 'infinity'::timestamptz) as se
    from public.price_history h
    where h.format_id = f
      and h.valid_from < before
      and coalesce(h.valid_to, 'infinity'::timestamptz) > before - interval '30 days'
  )
  select min(p) from (
    select regular as p from seg
      where s < e and (sale is null or s < ss or e > se)
    union all
    select sale from seg
      where s < e and sale is not null and greatest(s, ss) < least(e, se)
  ) c;
$$;

-- ---------------------------------------------------------------- lists (shelves)
create table public.lists (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  mode       public.list_mode not null default 'manual',
  rule       jsonb not null default '{}',
  max_items  int not null default 10,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table public.list_translations (
  list_id    uuid not null references public.lists (id) on delete cascade,
  lang       text not null references public.languages (code) on update cascade,
  name       text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (list_id, lang)
);
create table public.list_items (
  list_id   uuid not null references public.lists (id) on delete cascade,
  format_id uuid not null references public.formats (id) on delete cascade,
  position  int not null,
  pinned    boolean not null default true,
  primary key (list_id, format_id)
);
create index list_items_format on public.list_items (format_id);

-- ---------------------------------------------------------------- articles
create table public.articles (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid references public.authors (id) on delete set null,
  cover_media_id uuid references public.media (id) on delete set null,
  status         public.content_status not null default 'draft',
  publish_at     timestamptz,
  wix_url        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create index articles_publish on public.articles (status, publish_at);

create table public.article_translations (
  article_id      uuid not null references public.articles (id) on delete cascade,
  lang            text not null references public.languages (code) on update cascade,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null,
  excerpt         text,
  body_json       jsonb,
  body_html       text,
  reading_minutes int,
  seo_title       text,
  seo_description text,
  complete        boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  primary key (article_id, lang),
  unique (lang, slug)
);

create table public.article_categories (
  article_id  uuid not null references public.articles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (article_id, category_id)
);
create index article_categories_category on public.article_categories (category_id);

create table public.article_books (
  article_id uuid not null references public.articles (id) on delete cascade,
  book_id    uuid not null references public.books (id) on delete cascade,
  position   int not null,
  primary key (article_id, book_id)
);
create index article_books_book on public.article_books (book_id);

create table public.related_articles (
  book_id    uuid not null references public.books (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  position   int not null check (position between 1 and 3),
  primary key (book_id, position),
  unique (book_id, article_id)
);
create index related_articles_article on public.related_articles (article_id);

-- ---------------------------------------------------------------- homepage extras, settings, publishing
create table public.instagram_tiles (
  id         uuid primary key default gen_random_uuid(),
  media_id   uuid not null references public.media (id) on delete cascade,
  post_url   text,
  position   int not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index instagram_tiles_media on public.instagram_tiles (media_id);

create table public.settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,   -- readable by the public build
  note       text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.publish_runs (
  id             uuid primary key default gen_random_uuid(),
  triggered_by   uuid,
  status         text not null default 'queued' check (status in ('queued', 'running', 'success', 'failed')),
  github_run_url text,
  message        text,
  created_at     timestamptz not null default now(),
  finished_at    timestamptz
);

-- ---------------------------------------------------------------- shipping (Bookvault services)
create table public.shipping_regions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  countries  text[] not null check (array_length(countries, 1) > 0),   -- ISO 3166-1 alpha-2
  sort       int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.shipping_options (
  id                     uuid primary key default gen_random_uuid(),
  region_id              uuid not null references public.shipping_regions (id) on delete cascade,
  carrier                text not null,
  service_name           text not null,
  bookvault_service_code text,               -- Phase 8 (API)
  tracked                boolean not null default true,
  price_eur_cents        int not null check (price_eur_cents >= 0),
  price_usd_cents        int not null check (price_usd_cents >= 0),
  extra_item_eur_cents   int not null default 0 check (extra_item_eur_cents >= 0),
  extra_item_usd_cents   int not null default 0 check (extra_item_usd_cents >= 0),
  delivery_min_days      int not null check (delivery_min_days >= 0),
  delivery_max_days      int not null,
  active                 boolean not null default true,
  sort                   int not null default 0,
  source_note            text,               -- e.g. "Bookvault Quote Tool, 26 Nov 2026"
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  updated_by             uuid,
  check (delivery_max_days >= delivery_min_days)
);
create index shipping_options_region on public.shipping_options (region_id);

-- ---------------------------------------------------------------- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['media','authors','author_translations','categories','category_translations','collections',
    'collection_translations','books','book_translations','formats','lists','list_translations','articles',
    'article_translations','instagram_tiles','settings','shipping_regions','shipping_options']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_updated', t);
  end loop;
end $$;

-- foreign-key indexes for media references
create index authors_photo on public.authors (photo_media_id);
create index categories_image on public.categories (image_media_id);
create index collections_cover on public.collections (cover_media_id);
create index books_cover on public.books (cover_media_id);
create index books_collection on public.books (collection_id);
create index articles_cover on public.articles (cover_media_id);
create index articles_author on public.articles (author_id);
create index formats_collection on public.formats (collection_id);

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['media','authors','author_translations','categories','category_translations','collections',
    'collection_translations','books','book_translations','book_contributors','book_categories','book_gallery',
    'related_books','formats','bundle_items','preview_pages','price_history','lists','list_translations','list_items',
    'articles','article_translations','article_categories','article_books','related_articles','instagram_tiles',
    'settings','publish_runs','shipping_regions','shipping_options']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- staff read everything; Owner + Editor write
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_staff()))',
                   t || '_staff_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_editor()))',
                   t || '_editor_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))',
                   t || '_editor_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_editor()))',
                   t || '_editor_delete', t);
  end loop;
end $$;

-- price history is written by trigger only
drop policy price_history_editor_insert on public.price_history;
drop policy price_history_editor_update on public.price_history;
drop policy price_history_editor_delete on public.price_history;

-- public (anon + signed-in visitors) read: published content only
create policy media_public_read on public.media for select to anon, authenticated using (true);

create policy authors_public_read on public.authors for select to anon, authenticated
  using (status = 'published');
create policy author_translations_public_read on public.author_translations for select to anon, authenticated
  using (complete and public.lang_enabled(lang)
         and exists (select 1 from public.authors a where a.id = author_id and a.status = 'published'));

create policy categories_public_read on public.categories for select to anon, authenticated
  using (status = 'published');
create policy category_translations_public_read on public.category_translations for select to anon, authenticated
  using (complete and public.lang_enabled(lang)
         and exists (select 1 from public.categories c where c.id = category_id and c.status = 'published'));

create policy collections_public_read on public.collections for select to anon, authenticated
  using (status = 'published');
create policy collection_translations_public_read on public.collection_translations for select to anon, authenticated
  using (complete and public.lang_enabled(lang)
         and exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published'));

create policy books_public_read on public.books for select to anon, authenticated
  using (public.is_live(status, publish_at));
create policy book_translations_public_read on public.book_translations for select to anon, authenticated
  using (complete and public.lang_enabled(lang)
         and exists (select 1 from public.books b where b.id = book_id and public.is_live(b.status, b.publish_at)));
create policy book_contributors_public_read on public.book_contributors for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_id and public.is_live(b.status, b.publish_at)));
create policy book_categories_public_read on public.book_categories for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_id and public.is_live(b.status, b.publish_at)));
create policy book_gallery_public_read on public.book_gallery for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_id and public.is_live(b.status, b.publish_at)));
create policy related_books_public_read on public.related_books for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_id and public.is_live(b.status, b.publish_at)));

create policy formats_public_read on public.formats for select to anon, authenticated
  using (availability <> 'hidden'
         and (exists (select 1 from public.books b where b.id = book_id and public.is_live(b.status, b.publish_at))
              or exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published')));
create policy bundle_items_public_read on public.bundle_items for select to anon, authenticated using (true);
create policy preview_pages_public_read on public.preview_pages for select to anon, authenticated using (true);
create policy price_history_public_read on public.price_history for select to anon, authenticated using (true);

create policy lists_public_read on public.lists for select to anon, authenticated using (true);
create policy list_translations_public_read on public.list_translations for select to anon, authenticated
  using (public.lang_enabled(lang));
create policy list_items_public_read on public.list_items for select to anon, authenticated using (true);

create policy articles_public_read on public.articles for select to anon, authenticated
  using (public.is_live(status, publish_at));
create policy article_translations_public_read on public.article_translations for select to anon, authenticated
  using (complete and public.lang_enabled(lang)
         and exists (select 1 from public.articles a where a.id = article_id and public.is_live(a.status, a.publish_at)));
create policy article_categories_public_read on public.article_categories for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_id and public.is_live(a.status, a.publish_at)));
create policy article_books_public_read on public.article_books for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_id and public.is_live(a.status, a.publish_at)));
create policy related_articles_public_read on public.related_articles for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_id and public.is_live(a.status, a.publish_at)));

create policy instagram_tiles_public_read on public.instagram_tiles for select to anon, authenticated using (true);
create policy settings_public_read on public.settings for select to anon, authenticated using (is_public);

create policy shipping_regions_public_read on public.shipping_regions for select to anon, authenticated using (true);
create policy shipping_options_public_read on public.shipping_options for select to anon, authenticated using (active);

-- settings, languages, publish runs: only Owner changes store settings; Editors may start a publish run
drop policy settings_editor_insert on public.settings;
drop policy settings_editor_update on public.settings;
drop policy settings_editor_delete on public.settings;
create policy settings_owner_write on public.settings for all to authenticated
  using ((select public.has_role('owner'))) with check ((select public.has_role('owner')));
-- editors may change the homepage picks
create policy settings_editor_homepage on public.settings for update to authenticated
  using ((select public.is_editor()) and key like 'homepage.%')
  with check ((select public.is_editor()) and key like 'homepage.%');

-- ---------------------------------------------------------------- seeds
insert into public.lists (key, mode, rule, max_items) values
  ('bestsellers',  'mixed',     '{"source":"sales","days":90}', 10),
  ('new_releases', 'automatic', '{"days":90}',                  10),
  ('upcoming',     'automatic', '{"availability":"preorder"}',  10),
  ('on_sale',      'automatic', '{"on_sale":true}',             10);

insert into public.list_translations (list_id, lang, name)
select id, 'en', case key when 'bestsellers' then 'Bestsellers' when 'new_releases' then 'New releases'
                          when 'upcoming' then 'Coming soon' else 'On sale' end
from public.lists;

insert into public.settings (key, value, is_public, note) values
  ('store.company',            '{"name":"Obelisk Media B.V.","brand":"Obelisk Books","address":"Zinkstraat 24, 4823 AD Breda, The Netherlands","coc":"69586489","vat":"NL857929161B02"}', true, 'Company line in footer, emails, invoices'),
  ('store.emails',             '{"info":"info@obeliskbooks.com","order":"order@obeliskbooks.com"}', true, null),
  ('fulfilment.production_days','{"default":{"min":5,"max":7},"us_ca_au":{"min":7,"max":10}}', true, 'Bookvault Standard production time (roadmap §6.5)'),
  ('fulfilment.overdue_business_days', '3', false, 'Overdue tags and reminders (roadmap §6.6)'),
  ('ebooks.download_limit',    '5',  true, 'CONFIRM — downloads per format (FAQ a14)'),
  ('ebooks.link_hours',        '48', true, 'CONFIRM — signed download link lifetime'),
  ('auth.signin_link_minutes', '15', true, 'CONFIRM — sign-in link lifetime'),
  ('contact.reply_days',       '2',  true, 'CONFIRM — usual reply time in working days'),
  ('discounts.stacking',       '{"sale_prices":true,"automatic":"best_one","codes":1}', false, 'Roadmap §6.4 defaults'),
  ('bookvault.auto_send',      'false', false, 'Phase 8 — automatic Bookvault orders switch'),
  ('homepage.featured_book',   'null', true, 'Format id of the hero "New release" card'),
  ('homepage.featured_ebook',  'null', true, 'Format id shown in "Ebooks, delivered instantly"'),
  ('social.instagram',         '{"handle":"@obelisk.books","url":"https://www.instagram.com/obelisk.books/"}', true, null);
