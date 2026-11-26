# Obelisk Books — obeliskbooks.com rebuild

Astro (static) on Cloudflare Workers · Supabase project `obelisk-books` (ref `dguapjsdwtyjxfcuukgs`, EU Frankfurt).
Master plan: `obelisk-books-roadmap.md` in the claude.ai project; phase notes in `handoff/phase-<N>.md`.

## Layout
| Path | What |
|---|---|
| `src/pages/admin/index.astro` | Admin dashboard (React app, hash routes `/admin#/books/…`) |
| `src/admin/` | Dashboard screens, UI kit, 5-page ebook preview generator (`ui/preview.ts`) |
| `src/pages/index.astro` | Placeholder home — public pages come in Phase 3 |
| `src/lib/` | Supabase client, generated DB types, config |
| `supabase/migrations/` | Database schema, RLS, buckets, seeds — the source of truth for the database |
| `docs/obelisk-website-text-en-v1.3.docx` | English website text (seeded into `text_keys` / `text_translations`) |

## Commands
```bash
npm install
npm run dev        # http://localhost:4321/admin/
npm run build      # static output in dist/
npm run deploy     # build + wrangler deploy (needs Cloudflare login or API token)
npm run types:db   # regenerate src/lib/database.types.ts
```

## Rules
- Every table has RLS. Roles: `owner`, `editor`, `fulfilment` (`public.staff`); helpers live in schema `private`.
- New staff: add their email in the dashboard (Users & roles) → table `staff_invites`; the role applies on first sign-in.
- Secrets (Stripe, Resend, Bookvault) never go in the repo or the browser — Supabase / Cloudflare secrets only.
- The site sends `noindex` and `robots.txt` blocks all crawlers until Launch (Phase 9).
