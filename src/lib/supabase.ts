import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, STORAGE_PUBLIC } from './config';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export const publicUrl = (bucket: string, path?: string | null) =>
  path ? `${STORAGE_PUBLIC}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}` : '';

export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);

export const cents = (v: number | null | undefined) => (v == null ? '' : (v / 100).toFixed(2));
export const toCents = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return s.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100);
};
