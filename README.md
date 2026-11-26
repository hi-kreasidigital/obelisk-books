# Obelisk Books — obeliskbooks.com rebuild

Astro (static) on Cloudflare Workers · Supabase project `obelisk-books` (ref `dguapjsdwtyjxfcuukgs`, EU Frankfurt).
Master plan: `obelisk-books-roadmap.md` in the claude.ai project; phase notes in `handoff/phase-<N>.md`.

## Layout
| Path | What |
|---|---|
| `src/pages/[...lang]/` | **Public site** (Phase 3): every page once per site language — English at `/`, others under `/fr`, `/de`, `/it`, `/pt`, `/es` |
| `src/components/site/`, `src/layouts/Site.astro` | Header, footer, product card, price, listing, book page, help/legal templates; head with SEO, hreflang, Open Graph, JSON-LD |
| `src/lib/site/` | Build-time data loader (`load.ts`), helpers for URLs, text, money, shelves, structured data (`site.ts`) |
| `src/client/` | Small browser scripts: currency, language banner, cart count, search, listing filters |
| `src/worker.ts` | Worker for `/api/*` (Phase 3: `/api/geo`); everything else is static assets |
| `src/pages/sitemap-*.xml.ts`, `[...lang]/rss.xml.ts`, `search-index/`, `rates.json.ts` | Sitemaps per language, RSS per language, static search index, ECB rates |
| `src/pages/admin/index.astro` → `src/admin/` | Admin dashboard (React, hash routes `/admin#/books/…`) |
| `supabase/migrations/` | Database schema, RLS, buckets, seeds — the source of truth for the database |
| `supabase/functions/` | Edge Functions `publish-site` (dashboard button → GitHub build) and `publish-status` (build status back to the dashboard) |
| `scripts/` | `make-fixture.mjs` (local test data), `serve-fixture.mjs`, `text-additions.mjs` (website text v1.4 keys) |
| `docs/` | English website text (Word): v1.3 + v1.4 |

## Commands
```bash
npm install
npm run dev            # http://localhost:4321 — reads Supabase (needs network)
npm run build          # static output in dist/ from Supabase
npm run deploy         # build + wrangler deploy

# Offline / test data (no Supabase needed): fake catalog in EN + a fake-complete FR, images served locally
npm run fixture && npm run fixture:serve &   # makes fixtures/ and serves its images on :4400
npm run build:fixture && npx wrangler dev    # http://127.0.0.1:8787
PUBLIC_SITE_INDEXING=true npm run build:fixture   # build as at Launch (index, follow) — for Lighthouse SEO checks
```

## How the public site is built
- Data is read **at build time** with the publishable key; RLS only exposes published items and complete translations in enabled languages.
- A **language gets a site only when all its website text is translated** (dashboard → Languages shows the %). A book/article/… appears in a language only when its translation is ticked complete. Hreflang lists exactly the languages a page exists in.
- Prices in the HTML are **EUR** for everyone; the browser switches to USD or adds "Approx. ¥…" (Auto / EUR / USD switcher). The country comes from `/api/geo`; HTML never changes by IP.
- **Publishing:** dashboard → Publish site → Edge Function `publish-site` → GitHub `repository_dispatch: publish` → build + deploy (~2–4 min). Builds also run on every push to `main` and every 6 hours (scheduled items, sale start/end, exchange rates).
- **Indexing is off** (`noindex`, `X-Robots-Tag`, `robots.txt` Disallow) until Launch: set the GitHub repository variable `SITE_INDEXING=true` in Phase 9.

## Rules
- Every table has RLS. Roles: `owner`, `editor`, `fulfilment` (`public.staff`); helpers live in schema `private`.
- New staff: add their email in the dashboard (Users & roles) → table `staff_invites`; the role applies on first sign-in.
- Secrets (Stripe, Resend, Bookvault, GitHub publish token) never go in the repo or the browser — Supabase / Cloudflare secrets only.
- New website text keys: add them to a migration **and** the Word source in `docs/` (see `scripts/text-additions.mjs`).
