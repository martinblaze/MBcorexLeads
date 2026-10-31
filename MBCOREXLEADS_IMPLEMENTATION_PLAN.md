# MB CoreX Leads — Five-Phase Implementation Plan

This plan reflects the empty-workspace inspection and tracks implemented and remaining work. The first implementation pass completed the local-first core while leaving account-dependent operations clearly disabled.

## Phase 1 — Foundation, Architecture, Design and Integrations
**Objectives:** establish Next.js/TypeScript structure, responsive white/black/blue visual system, navigation and shared components, app metadata, secret handling, initial schema, and deployment readiness.
**Files/modules:** `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/lib/supabase.ts`, `.gitignore`, `.env.example`, Supabase migration, README.
**Dependencies:** Next.js, React, TypeScript, Lucide React, Supabase JS.
**Database changes:** initial businesses/interactions/message_templates tables; indexes; RLS.
**UI:** responsive sidebar/top bar, overview, account/settings surfaces, empty/loading/data states.
**Backend:** env-safe Supabase factory; do not expose privileged key.
**Acceptance:** app starts/builds; navigation and responsive layout work; no secrets; migration is reviewable.
**Testing:** install, typecheck, lint, production build; inspect key viewports.
**Checklist:** [x] foundation [x] styling/navigation [x] owner-scoped schema [x] env sample [x] Supabase Auth/data writes [ ] live preview.
**Credentials/config:** Supabase project URL and anon key for live use; GitHub/Vercel accounts for hosted connections.

## Phase 2 — Business Discovery and Lead Database
**Objectives:** support category/location queries, verified source collection or manual import, normalized lead storage, duplicate checks, sorting/filtering/export and clear source state.
**Files/modules:** discovery view and lead table in `src/app/page.tsx`; `src/lib/core.ts`; migration; tests.
**Dependencies:** current Next/React stack; optional source APIs only after terms review.
**Database changes:** business source/contact/location fields and lookup indexes.
**UI:** category, country, state, city, keywords/source criteria; source status; import/search/filter; duplicate feedback.
**Backend:** validate imported fields; attach source URL; keep collection modular; no Google Maps scraping.
**Acceptance:** manual records and CSV can be added, searched, filtered, exported; duplicate phone and name/city matches are skipped; empty/error states are honest.
**Testing:** phone normalization, duplicates, CSV parsing/import validation; source failure state.
**Checklist:** [x] saved-record search by category/location/keywords [x] source selection removed per user request [x] CSV import/export [x] duplicate checks [ ] interactive column mapping [ ] verified collector [x] Supabase business persistence.
**Credentials/config:** none for manual workflow; source-specific approved API credentials only if sources provide them.

## Phase 3 — Message Generation and Outreach Queue
**Objectives:** preserve exact approved template, personalize names, preview/copy, queue manual outreach, create WhatsApp click-to-chat links, track manual send and avoid duplicate outreach.
**Files/modules:** template, queue, lead actions in `src/app/page.tsx`; message utilities and tests in `src/lib/core.ts` / `tests/core.test.mjs`.
**Dependencies:** Lucide React; browser clipboard and `wa.me` links.
**Database changes:** persist sent status/timestamps and contact preferences when Supabase is connected.
**UI:** queue progression, prior/next/skip, message preview, copy, open WhatsApp, mark sent.
**Backend:** no automatic sending; never infer delivery from opening WhatsApp; honor opt-outs.
**Acceptance:** exact text/paragraphs remain unchanged other than placeholders; invalid phone shows clear feedback; queue excludes opted out/sent/no-phone leads.
**Testing:** template personalization, WhatsApp URL, queue behavior and status changes.
**Checklist:** [x] approved template [x] preview/copy [x] click-to-chat [x] manual sent marker [x] queue [x] status/contact fields sync to Supabase [ ] interaction event log.
**Credentials/config:** no WhatsApp API key for manual click-to-chat. Official Business Platform credentials/webhook needed only for a future approved integration.

## Phase 4 — Conversations, CRM and Follow-ups
**Objectives:** record replies and notes, maintain lead statuses/timeline, schedule follow-ups, highlight overdue/upcoming/interested prospects, prepare official WhatsApp sync boundaries.
**Files/modules:** conversations, follow-up, status controls in `src/app/page.tsx`; interaction migration.
**Dependencies:** Supabase Auth/storage once connected; reminder provider only if notifications are enabled.
**Database changes:** interactions and next-follow-up fields are present in initial schema.
**UI:** status selector, notes, follow-up lists, contact timeline and outcomes.
**Backend:** manual-only reply capture; no unauthorized sync or automated marketing sends.
**Acceptance:** operator can update every requested status and schedule/see a follow-up; no screen claims automatic message reading.
**Testing:** status transitions, date grouping, opt-out exclusion.
**Checklist:** [x] status editing [x] notes on lead [x] due/upcoming follow-ups [ ] full interaction timeline [ ] reminders [x] authenticated durable business storage.
**Credentials/config:** none for manual notes; future notifications/WhatsApp Platform require separately configured provider credentials.

## Phase 5 — Analytics, Testing, Hardening and Deployment
**Objectives:** use real saved records in analytics, complete security/error states, improve performance, verify tests/build, migrate Supabase, connect GitHub/Vercel, document backups and recovery.
**Files/modules:** dashboard/analytics in `src/app/page.tsx`, tests, migration, `.env.example`, README and deployment docs.
**Dependencies:** npm toolchain; GitHub/Vercel/Supabase accounts for live deployment.
**Database changes:** apply migration; add owner ID + owner-scoped policies before multi-user access; establish backup schedule.
**UI:** real counts and chart trends, no synthetic records.
**Backend:** production database access, secure auth, migration operations, errors/logging.
**Acceptance:** tests, typecheck, lint and production build pass; deployed app uses durable DB; recovery steps documented.
**Testing:** core unit tests plus authenticated CRUD/import/outreach smoke and deployed end-to-end checks.
**Checklist:** [x] real local-storage metrics [x] core utility tests written and passing [x] migration/docs [x] typecheck/lint/build/audit and HTTP smoke verified [ ] live Supabase [ ] GitHub/Vercel deployment [ ] backup exercise.
**Credentials/config:** Supabase project, GitHub repository/account, Vercel account; optional domain. No paid discovery/WhatsApp APIs enabled.
