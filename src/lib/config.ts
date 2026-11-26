// Public (browser-safe) configuration. The publishable key only allows what RLS allows.
export const SUPABASE_URL =
  import.meta.env.PUBLIC_SUPABASE_URL ?? 'https://dguapjsdwtyjxfcuukgs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_GORdNh-mtYO7AHjhWoN-yQ_T1lxv2e8';
export const STORAGE_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public`;
