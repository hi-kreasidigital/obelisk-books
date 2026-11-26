// Public (browser-safe) configuration. The publishable key only allows what RLS allows.
export const SUPABASE_URL =
  import.meta.env.PUBLIC_SUPABASE_URL ?? 'https://dguapjsdwtyjxfcuukgs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_GORdNh-mtYO7AHjhWoN-yQ_T1lxv2e8';
export const STORAGE_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public`;

// Stripe sandbox ("Obelisk Books – development"). Publishable keys are public by design.
// Live key replaces this in Phase 8; the secret key lives only in Supabase secrets (STRIPE_SECRET_KEY).
export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  'pk_test_51Uf2GYBZ1Lq0E9moMkTQ17Pn9Tyf1e0Fb4AWvcAprExnGcRREcbZSwk9n6kRZhOO8LVS6jpzFzlBJW7CXSzdHyma00yAniKRsl';
export const STRIPE_MODE = STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ? 'live' : 'test';
