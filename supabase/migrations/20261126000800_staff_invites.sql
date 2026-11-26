-- Obelisk Books — Phase 2 — 0008: staff invites
-- An Owner adds an email + role; when that email signs in for the first time (or already exists) it becomes staff.

create table public.staff_invites (
  email        extensions.citext primary key,
  role         public.staff_role not null,
  display_name text not null,
  invited_by   uuid,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
alter table public.staff_invites enable row level security;
create policy staff_invites_owner on public.staff_invites for all to authenticated
  using ((select private.has_role('owner'))) with check ((select private.has_role('owner')));
create policy staff_invites_staff_read on public.staff_invites for select to authenticated
  using ((select private.is_staff()));

create or replace function private.accept_staff_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
declare inv public.staff_invites;
begin
  select * into inv from public.staff_invites where email = new.email::extensions.citext and accepted_at is null;
  if found then
    insert into public.staff (user_id, role, display_name) values (new.id, inv.role, inv.display_name)
      on conflict (user_id) do update set role = excluded.role, active = true;
    update public.staff_invites set accepted_at = now() where email = inv.email;
  end if;
  return new;
end $$;
revoke execute on function private.accept_staff_invite() from public, anon, authenticated;

create trigger on_auth_user_created_staff after insert on auth.users
  for each row execute function private.accept_staff_invite();

-- when an invite is added for an email that already has an account, activate it straight away
create or replace function private.apply_invite_to_existing_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = new.email::text limit 1;
  if uid is not null then
    insert into public.staff (user_id, role, display_name) values (uid, new.role, new.display_name)
      on conflict (user_id) do update set role = excluded.role, active = true;
    new.accepted_at := now();
  end if;
  return new;
end $$;
revoke execute on function private.apply_invite_to_existing_user() from public, anon, authenticated;
create trigger staff_invites_apply before insert on public.staff_invites
  for each row execute function private.apply_invite_to_existing_user();

-- first Owner (client, 26 Nov 2026)
insert into public.staff_invites (email, role, display_name) values ('info@obeliskbooks.com', 'owner', 'Obelisk Books');
