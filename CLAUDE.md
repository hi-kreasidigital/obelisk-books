# Obelisk Books — notes for Claude

- Read `obelisk-books-roadmap.md` (claude.ai project) and the latest `handoff/phase-<N>.md` before starting a phase. Don't change roadmap decisions without asking the client.
- Database changes: add a numbered file in `supabase/migrations/` AND apply it to project `dguapjsdwtyjxfcuukgs`; then regenerate `src/lib/database.types.ts`.
- Roles: owner (everything), editor (catalog, content, translations, orders), fulfilment (orders only). RLS on every table. Use `private.is_staff()`, `private.is_editor()`, `private.is_fulfilment()`, `private.has_role(...)` in policies.
- Website text keys: never rename or delete keys without updating the Word source (`docs/`) and the `text_keys` table together. Keep the client's wording ("series" stays where it means book series; "Collections" is the menu name).
- Brand: teal `#007A82` buttons / `#006E75` text, orange `#D89616` fills with dark text only, Oswald + Source Sans 3.
