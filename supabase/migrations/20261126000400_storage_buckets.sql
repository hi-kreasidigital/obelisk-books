-- Obelisk Books — Phase 2 — 0004: storage buckets
-- covers, previews, media: public read · ebooks: private (signed links from server functions only)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('covers',   'covers',   true,  10485760,  array['image/jpeg','image/png','image/webp','image/avif']),
  ('previews', 'previews', true,  10485760,  array['image/webp','image/jpeg','image/png']),
  ('media',    'media',    true,  15728640,  array['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml']),
  ('ebooks',   'ebooks',   false, 209715200, array['application/epub+zip','application/pdf']);

-- Owner + Editor upload, replace and delete in all four buckets
create policy obelisk_editor_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('covers', 'previews', 'media', 'ebooks') and (select public.is_editor()));
create policy obelisk_editor_update on storage.objects for update to authenticated
  using (bucket_id in ('covers', 'previews', 'media', 'ebooks') and (select public.is_editor()))
  with check (bucket_id in ('covers', 'previews', 'media', 'ebooks') and (select public.is_editor()));
create policy obelisk_editor_delete on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'previews', 'media', 'ebooks') and (select public.is_editor()));
-- staff can list/read objects (needed for the dashboard, incl. private ebooks)
create policy obelisk_staff_read on storage.objects for select to authenticated
  using (bucket_id in ('covers', 'previews', 'media', 'ebooks') and (select public.is_staff()));
-- public buckets are served through their public URLs; no anon listing policy is added
