-- Obelisk Books — Phase 2 — 0005: move security-definer helpers out of the API-exposed public schema
-- Existing policies keep working (they reference the functions by OID). New migrations use private.*.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_staff()                       set schema private;
alter function public.has_role(public.staff_role[])    set schema private;
alter function public.is_editor()                      set schema private;
alter function public.is_fulfilment()                  set schema private;
alter function public.lang_enabled(text)               set schema private;

create or replace function private.is_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('owner', 'editor');
$$;

create or replace function private.is_fulfilment()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('owner', 'fulfilment');
$$;

-- trigger-only function: nobody needs to call it directly
revoke execute on function public.log_price_history() from public, anon, authenticated;
