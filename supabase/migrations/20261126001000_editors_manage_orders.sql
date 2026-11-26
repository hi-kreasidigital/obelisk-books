-- Obelisk Books — Phase 2 — 0010: Editors can also manage orders (client, 26 Nov 2026)
-- private.is_fulfilment() = "may work on orders, shipments, customers": now Owner, Editor and Fulfilment.
create or replace function private.is_fulfilment()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('owner', 'editor', 'fulfilment');
$$;
