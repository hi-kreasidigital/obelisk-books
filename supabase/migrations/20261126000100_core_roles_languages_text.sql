-- Obelisk Books — Phase 2 — 0001: core helpers, staff roles, languages, website text
-- NOTE: helpers is_staff/has_role/is_editor/is_fulfilment/lang_enabled are moved to schema "private" in 0005.
-- Roles (decided 26 Nov 2026): owner, editor, fulfilment. Editors also translate all languages.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;

-- ---------------------------------------------------------------- staff & roles
create type public.staff_role as enum ('owner', 'editor', 'fulfilment');

create table public.staff (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         public.staff_role not null,
  display_name text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid
);
comment on table public.staff is 'Dashboard users. Owner: everything. Editor: catalog, content, translations, shipping, discounts; orders read-only. Fulfilment: orders, shipments, customers.';

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.active);
$$;

create or replace function public.has_role(variadic roles public.staff_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s
                 where s.user_id = auth.uid() and s.active and s.role = any (roles));
$$;

-- shorthand: may edit catalog / content / translations
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('owner', 'editor');
$$;

-- shorthand: may work on orders
create or replace function public.is_fulfilment()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('owner', 'fulfilment');
$$;

revoke execute on function public.is_staff(), public.has_role(public.staff_role[]),
  public.is_editor(), public.is_fulfilment() from public;
grant execute on function public.is_staff(), public.has_role(public.staff_role[]),
  public.is_editor(), public.is_fulfilment() to anon, authenticated;

create trigger staff_updated before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.staff enable row level security;
create policy staff_read on public.staff for select to authenticated
  using ((select public.is_staff()));
create policy staff_owner_write on public.staff for all to authenticated
  using ((select public.has_role('owner'))) with check ((select public.has_role('owner')));

-- ---------------------------------------------------------------- languages
create table public.languages (
  code        text primary key,               -- hreflang code: en, fr, de, it, pt-BR, es, hi, ja, zh-Hans, ko
  url_prefix  text not null unique,           -- '' for English, 'pt' for pt-BR, 'zh' for zh-Hans
  name_en     text not null,
  native_name text not null,
  enabled     boolean not null default false,
  is_default  boolean not null default false,
  sort        int not null default 0,
  notes       text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create unique index languages_one_default on public.languages (is_default) where is_default;

create trigger languages_updated before update on public.languages
  for each row execute function public.set_updated_at();

alter table public.languages enable row level security;
create policy languages_public_read on public.languages for select to anon, authenticated
  using (enabled or (select public.is_staff()));
create policy languages_owner_write on public.languages for all to authenticated
  using ((select public.has_role('owner'))) with check ((select public.has_role('owner')));

insert into public.languages (code, url_prefix, name_en, native_name, enabled, is_default, sort, notes) values
  ('en',      '',   'English',               'English',              true,  true,  1, null),
  ('fr',      'fr', 'French',                'Français',             true,  false, 2, null),
  ('de',      'de', 'German',                'Deutsch',              true,  false, 3, null),
  ('it',      'it', 'Italian',               'Italiano',             true,  false, 4, null),
  ('pt-BR',   'pt', 'Portuguese (Brazil)',   'Português (Brasil)',   true,  false, 5, null),
  ('es',      'es', 'Spanish',               'Español',              true,  false, 6, null),
  ('hi',      'hi', 'Hindi',                 'हिन्दी',                 false, false, 7, 'Later upgrade project — needs a Devanagari web font'),
  ('ja',      'ja', 'Japanese',              '日本語',                false, false, 8, 'Later upgrade project — needs a Japanese web font'),
  ('zh-Hans', 'zh', 'Chinese (Simplified)',  '简体中文',               false, false, 9, 'Later upgrade project — needs a Simplified Chinese web font'),
  ('ko',      'ko', 'Korean',                '한국어',                false, false, 10, 'Later upgrade project — needs a Korean web font');

-- ---------------------------------------------------------------- website text
create table public.text_keys (
  key           text primary key,
  section_no    int  not null,
  section_title text not null,
  note          text,
  max_length    int,
  placeholders  text[] not null default '{}',
  needs_confirm boolean not null default false,
  sort          int not null default 0,
  removed_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

create table public.text_translations (
  key        text not null references public.text_keys (key) on update cascade on delete cascade,
  lang       text not null references public.languages (code) on update cascade,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (key, lang)
);
create index text_translations_lang on public.text_translations (lang);

-- distinct, sorted {placeholders} in a text
create or replace function public.text_placeholders(t text)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct m[1] order by m[1]), '{}')
  from regexp_matches(coalesce(t, ''), '\{([a-z_]+)\}', 'g') as m;
$$;

-- A translation must contain exactly the same placeholders as the English source.
create or replace function public.check_text_placeholders()
returns trigger language plpgsql set search_path = '' as $$
declare
  expected text[];
  found    text[];
begin
  if new.lang = 'en' then
    update public.text_keys set placeholders = public.text_placeholders(new.value) where key = new.key;
    return new;
  end if;
  if btrim(new.value) = '' then
    raise exception 'Translation for % (%) is empty', new.key, new.lang;
  end if;
  select public.text_placeholders(value) into expected
    from public.text_translations where key = new.key and lang = 'en';
  found := public.text_placeholders(new.value);
  if coalesce(expected, '{}') <> found then
    raise exception 'This translation must contain exactly these placeholders: % (found: %)',
      coalesce(nullif(array_to_string(expected, ', '), ''), 'none'), coalesce(nullif(array_to_string(found, ', '), ''), 'none')
      using errcode = 'check_violation', hint = 'Keep everything in {curly braces} exactly as written in English.';
  end if;
  return new;
end $$;

create trigger text_translations_placeholders before insert or update of value on public.text_translations
  for each row execute function public.check_text_placeholders();
create trigger text_translations_updated before update on public.text_translations
  for each row execute function public.set_updated_at();
create trigger text_keys_updated before update on public.text_keys
  for each row execute function public.set_updated_at();

alter table public.text_keys enable row level security;
alter table public.text_translations enable row level security;

create policy text_keys_read on public.text_keys for select to anon, authenticated using (true);
create policy text_keys_editor_write on public.text_keys for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy text_translations_public_read on public.text_translations for select to anon, authenticated
  using ((select public.is_staff())
         or exists (select 1 from public.languages l where l.code = lang and l.enabled));
create policy text_translations_editor_write on public.text_translations for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));
