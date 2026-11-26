-- Obelisk Books — Phase 2 — 0003: discounts, customers, orders, print shipments, Bookvault events, ebook entitlements, views
-- Tables only; the discount engine is built in Phase 4 and the order screens in Phase 5.

-- ---------------------------------------------------------------- discounts
create type public.discount_kind    as enum ('code', 'automatic');
create type public.discount_type    as enum ('percent', 'fixed', 'free_shipping', 'free_ebook', 'free_100', 'buy_x_get_y', 'print_ebook_combo', 'set_price');
create type public.discount_scope   as enum ('order', 'formats', 'category', 'collection', 'print', 'ebooks');

create table public.discounts (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  kind                     public.discount_kind not null,
  type                     public.discount_type not null,
  percent                  numeric(5,2) check (percent > 0 and percent <= 100),
  amount_eur_cents         int check (amount_eur_cents >= 0),
  amount_usd_cents         int check (amount_usd_cents >= 0),
  applies_to               public.discount_scope not null default 'order',
  min_subtotal_eur_cents   int,
  min_subtotal_usd_cents   int,
  first_order_only         boolean not null default false,
  signed_in_only           boolean not null default false,
  allowed_emails           extensions.citext[] not null default '{}',
  starts_at                timestamptz,
  ends_at                  timestamptz,
  max_uses                 int,
  max_uses_per_customer    int,
  stackable_with_code      boolean not null default true,
  rule                     jsonb not null default '{}',   -- buy X get Y etc.
  active                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  updated_by               uuid
);

create table public.discount_targets (
  discount_id uuid not null references public.discounts (id) on delete cascade,
  target_type text not null check (target_type in ('format', 'category', 'collection')),
  target_id   uuid not null,
  primary key (discount_id, target_type, target_id)
);

create table public.discount_codes (
  id             uuid primary key default gen_random_uuid(),
  discount_id    uuid not null references public.discounts (id) on delete cascade,
  code           extensions.citext not null unique,
  assigned_email extensions.citext,
  single_use     boolean not null default false,
  uses           int not null default 0,
  created_at     timestamptz not null default now()
);
create index discount_codes_discount on public.discount_codes (discount_id);

-- ---------------------------------------------------------------- customers
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique references auth.users (id) on delete set null,
  email              extensions.citext,
  name               text,
  phone              text,
  preferred_lang     text references public.languages (code) on update cascade,
  preferred_currency text check (preferred_currency in ('EUR', 'USD')),
  anonymised_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);
create index customers_email on public.customers (email);
create index customers_lang on public.customers (preferred_lang);

create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  full_name   text not null,
  company     text,
  line1       text not null,
  line2       text,
  postal_code text,
  city        text not null,
  region      text,
  country     text not null check (country ~ '^[A-Z]{2}$'),
  phone       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index addresses_customer on public.addresses (customer_id);

-- ---------------------------------------------------------------- orders
create type public.payment_status  as enum ('pending', 'paid', 'free_copy', 'partially_refunded', 'refunded', 'failed', 'disputed');
create type public.shipment_status as enum ('to_send', 'sent_to_bookvault', 'sent_to_print', 'printed', 'shipped', 'cancelled', 'on_hold', 'reprint');

create sequence public.order_number_seq start with 10057;   -- Wix orders #10001–#10056 are imported with their own numbers

create table public.orders (
  id                         uuid primary key default gen_random_uuid(),
  number                     bigint not null unique default nextval('public.order_number_seq'),
  customer_id                uuid references public.customers (id) on delete set null,
  email                      extensions.citext not null,
  lang                       text not null default 'en' references public.languages (code) on update cascade,
  currency                   text not null check (currency in ('EUR', 'USD')),
  payment_status             public.payment_status not null default 'pending',
  subtotal_cents             int not null default 0,
  discount_cents             int not null default 0,
  shipping_cents             int not null default 0,
  tax_cents                  int not null default 0,
  total_cents                int not null default 0 check (total_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text unique,
  payment_method             text,
  shipping_address           jsonb,
  billing_address            jsonb,
  shipping_option_id         uuid references public.shipping_options (id) on delete set null,
  shipping_snapshot          jsonb,      -- carrier, service, tracked, price, delivery days at order time
  ebook_consent_at           timestamptz,
  lookup_token_hash          text,
  is_historic                boolean not null default false,   -- imported from Wix, read-only
  paid_at                    timestamptz,
  notes                      text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  updated_by                 uuid
);
alter sequence public.order_number_seq owned by public.orders.number;
create index orders_customer on public.orders (customer_id);
create index orders_email on public.orders (email);
create index orders_created on public.orders (created_at desc);
create index orders_shipping_option on public.orders (shipping_option_id);
create index orders_lang on public.orders (lang);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  format_id        uuid references public.formats (id) on delete set null,
  parent_item_id   uuid references public.order_items (id) on delete cascade,  -- books listed under a set line
  title            text not null,
  format_type      public.format_type not null,
  isbn13           text,
  bookvault_sku    text,
  quantity         int not null default 1 check (quantity > 0),
  unit_price_cents int not null default 0,
  discount_cents   int not null default 0,
  created_at       timestamptz not null default now()
);
create index order_items_order on public.order_items (order_id);
create index order_items_format on public.order_items (format_id);
create index order_items_parent on public.order_items (parent_item_id);

create table public.discount_redemptions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  discount_id  uuid references public.discounts (id) on delete set null,
  code_id      uuid references public.discount_codes (id) on delete set null,
  amount_cents int not null,
  created_at   timestamptz not null default now()
);
create index discount_redemptions_order on public.discount_redemptions (order_id);
create index discount_redemptions_discount on public.discount_redemptions (discount_id);
create index discount_redemptions_code on public.discount_redemptions (code_id);

-- one Bookvault order per shipment; a pre-order book in a set gets a second shipment
create table public.print_shipments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  status               public.shipment_status not null default 'to_send',
  is_preorder_followup boolean not null default false,
  release_date         date,
  sent_via             text check (sent_via in ('manual', 'api')),
  bookvault_pod_ref    text unique,          -- Bookvault order reference (podRef)
  sent_at              timestamptz,
  has_tracking         boolean not null default true,
  carrier              text,
  tracking_number      text,
  tracking_url         text,
  shipped_at           timestamptz,
  reprint_of_id        uuid references public.print_shipments (id) on delete set null,
  problem_note         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);
create index print_shipments_order on public.print_shipments (order_id);
create index print_shipments_status on public.print_shipments (status);
create index print_shipments_reprint on public.print_shipments (reprint_of_id);

create table public.print_shipment_items (
  shipment_id   uuid not null references public.print_shipments (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  quantity      int not null check (quantity > 0),
  primary key (shipment_id, order_item_id)
);
create index print_shipment_items_item on public.print_shipment_items (order_item_id);

create table public.bookvault_events (
  id              bigint generated always as identity primary key,
  shipment_id     uuid references public.print_shipments (id) on delete set null,
  pod_ref         text,
  event_type      text not null check (event_type in ('ORDER_CREATED', 'ORDER_ACKNOWLEDGED', 'ORDER_SENTTOPRINT',
                                                      'ORDER_PRINTED', 'ORDER_SHIPPED', 'API_REQUEST', 'API_ERROR', 'MANUAL')),
  source          text not null check (source in ('webhook', 'api', 'manual')),
  payload         jsonb not null default '{}',
  signature_valid boolean,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  error           text,
  actor_user_id   uuid
);
create index bookvault_events_shipment on public.bookvault_events (shipment_id);
create index bookvault_events_pod_ref on public.bookvault_events (pod_ref);

create table public.ebook_entitlements (
  id              uuid primary key default gen_random_uuid(),
  order_item_id   uuid not null references public.order_items (id) on delete cascade,
  format_id       uuid references public.formats (id) on delete set null,
  customer_id     uuid references public.customers (id) on delete set null,
  download_limit  int not null default 5,
  downloads_epub  int not null default 0,
  downloads_pdf   int not null default 0,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index ebook_entitlements_item on public.ebook_entitlements (order_item_id);
create index ebook_entitlements_customer on public.ebook_entitlements (customer_id);
create index ebook_entitlements_format on public.ebook_entitlements (format_id);

create table public.order_events (
  id            bigint generated always as identity primary key,
  order_id      uuid not null references public.orders (id) on delete cascade,
  type          text not null,
  data          jsonb not null default '{}',
  actor_user_id uuid,
  created_at    timestamptz not null default now()
);
create index order_events_order on public.order_events (order_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['discounts','customers','addresses','orders','print_shipments']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_updated', t);
  end loop;
end $$;

-- historic Wix orders are read-only
create or replace function public.protect_historic_orders()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_historic then
    raise exception 'Order % was imported from Wix and is read-only', old.number;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger orders_protect_historic before update or delete on public.orders
  for each row execute function public.protect_historic_orders();

-- ---------------------------------------------------------------- RLS
-- discounts: staff read, Owner + Editor write
do $$
declare t text;
begin
  foreach t in array array['discounts','discount_targets','discount_codes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_staff()))', t || '_staff_read', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))', t || '_editor_write', t);
  end loop;
end $$;

-- orders & fulfilment: all staff read (Editor read-only), Owner + Fulfilment write
do $$
declare t text;
begin
  foreach t in array array['customers','addresses','orders','order_items','discount_redemptions','print_shipments',
                           'print_shipment_items','bookvault_events','ebook_entitlements','order_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_staff()))', t || '_staff_read', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_fulfilment())) with check ((select public.is_fulfilment()))', t || '_fulfilment_write', t);
  end loop;
end $$;

-- signed-in visitors see their own data (account pages, Phase 5)
create policy customers_own_read on public.customers for select to authenticated
  using (user_id = (select auth.uid()));
create policy addresses_own on public.addresses for all to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())));
create policy orders_own_read on public.orders for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())));
create policy order_items_own_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o join public.customers c on c.id = o.customer_id
                 where o.id = order_id and c.user_id = (select auth.uid())));
create policy print_shipments_own_read on public.print_shipments for select to authenticated
  using (exists (select 1 from public.orders o join public.customers c on c.id = o.customer_id
                 where o.id = order_id and c.user_id = (select auth.uid())));
create policy ebook_entitlements_own_read on public.ebook_entitlements for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------- views
create or replace function public.business_days_between(a timestamptz, b timestamptz)
returns int language sql immutable set search_path = '' as $$
  select count(*)::int
  from generate_series(a::date + 1, b::date, interval '1 day') d
  where extract(isodow from d) < 6;
$$;

-- "Not yet processed – n days" / "Not yet shipped – n days" (shown from 3 business days)
create view public.print_shipments_overdue with (security_invoker = true) as
select s.id as shipment_id, s.order_id, o.number as order_number, s.status,
       case when s.status = 'to_send' then 'not_processed' else 'not_shipped' end as overdue_type,
       public.business_days_between(case when s.status = 'to_send' then coalesce(o.paid_at, o.created_at) else s.sent_at end, now()) as business_days
from public.print_shipments s
join public.orders o on o.id = s.order_id
where (s.status = 'to_send' and not s.is_preorder_followup)
   or s.status in ('sent_to_bookvault', 'sent_to_print', 'printed');

-- completeness per language for the Languages screen and the Phase 7 report
create view public.language_completeness with (security_invoker = true) as
with k as (select count(*) as n from public.text_keys where removed_at is null)
select l.code, l.enabled, l.sort,
  (select count(*) from public.text_translations t join public.text_keys tk on tk.key = t.key
     where t.lang = l.code and tk.removed_at is null) as text_done,
  (select n from k) as text_total,
  (select count(*) from public.book_translations x where x.lang = l.code and x.complete) as books_done,
  (select count(*) from public.books where status <> 'hidden') as books_total,
  (select count(*) from public.author_translations x where x.lang = l.code and x.complete) as authors_done,
  (select count(*) from public.authors where status <> 'hidden') as authors_total,
  (select count(*) from public.collection_translations x where x.lang = l.code and x.complete) as collections_done,
  (select count(*) from public.collections where status <> 'hidden') as collections_total,
  (select count(*) from public.category_translations x where x.lang = l.code and x.complete) as categories_done,
  (select count(*) from public.categories where status <> 'hidden') as categories_total,
  (select count(*) from public.article_translations x where x.lang = l.code and x.complete) as articles_done,
  (select count(*) from public.articles where status <> 'hidden') as articles_total
from public.languages l;
