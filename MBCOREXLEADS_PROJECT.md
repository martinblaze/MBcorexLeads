# MB CoreX Leads — Project Overview

## Purpose and requirements
Private business discovery and outreach CRM for MB CoreX Software Company. It stores discovered businesses, prepares the approved message, supports manual WhatsApp outreach, records lead status and follow-ups, and exports records. It is intended for one operator, with no SaaS billing or tenant management.

## Inspection decisions
At initial inspection the workspace was empty: no source files, framework, dependencies, environment files, Git repository, or configured remote existed. Node.js v24.17.0, npm 11.13.0 and Git 2.52.0 were available. No external credentials were present. Therefore this implementation establishes a new Next.js App Router project. Git history was not initialized or replaced.

## Architecture and current functionality
- Next.js 15 App Router, React 19, TypeScript, Lucide React; CSS design system in `src/app/globals.css`.
- One client workspace UI in `src/app/page.tsx`, with private browser `localStorage` persistence, responsive navigation, dashboard, saved lead list, create/edit/delete, status management, CSV import/export, JSON/XML export, outreach queue, manual send marking, click-to-chat, approved message template, follow-up lists, analytics and company settings.
- Business logic helpers in `src/lib/core.ts`: Nigerian phone normalization, duplicate matching, message personalization, WhatsApp URL creation and CSV parsing.
- Supabase browser client factory is present in `src/lib/supabase.ts`; migration is in `supabase/migrations/202610310001_initial_schema.sql`.
- Unit tests cover the core utilities in `tests/core.test.mjs`.
- `.env.example` contains placeholders only; `.gitignore` excludes local credentials/build output.

## Gaps and limitations
- With Supabase URL and anon key configured, the app supports Supabase email sign-in/sign-up and syncs business CRUD to PostgreSQL using the user's session and owner-scoped RLS. Without those credentials, it uses browser-local persistence.
- Supabase live behavior has not been verified against a real project because no credentials are configured. Local-mode records do not automatically migrate when switching to Supabase; import/export can be used to move records.
- Discovery is a manual research/import workflow. Index.ng, NaijaBased, and Novovibe links are provided, but no automated collector or source API is claimed. Their rules and endpoints need verification before any automation.
- Contacts, replies, sent state, and follow-up records are manually maintained. WhatsApp Business Platform, webhook sync, reminders, background jobs, charts package, and scheduled alerts are not connected.
- CSV import recognizes common header aliases and automatically maps them; there is not yet an interactive column-mapping screen or detailed per-row error report.
- No GitHub remote, Supabase project, Vercel project, custom domain, or external credentials were available at inspection.

## Proposed production architecture
Deploy the Next.js app on Vercel. Keep privileged operations server-side. Supabase PostgreSQL is the production record store, with Auth and owner-scoped RLS; browser access should use only the anon key. Use a Supabase migration workflow for schema changes. Move long-running collectors to a separately operated worker only after source permissions and runtime needs are verified; do not run long scraping loops in ordinary Vercel functions.

## Data model
- `businesses`: identity, location, contact details, source/source URL, discovery time, notes, outreach status, last contact, next follow-up, contact preferences, opt-out state.
- `interactions`: business-linked timeline entries (manual send, reply, note, call, meeting, proposal, status change).
- `message_templates`: approved template record.
- Indexes cover normalized lookup patterns, phone, status and follow-up dates. Add owner IDs and owner-scoped RLS before multi-user use.

## Supabase integration
Create a Supabase project, apply the SQL migration, enable email auth, and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The client signs users in and performs business table CRUD with RLS scoped to `owner_id = auth.uid()`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; the current app does not need it.

## Vercel deployment architecture
Vercel-compatible Next.js app with standard build/start scripts. Set the public Supabase URL/anon key in Vercel to enable durable authenticated records; with no credentials, the workspace falls back to that browser's local storage. Vercel currently restricts Hobby to non-commercial use, so this company tool requires a Pro plan if hosted there.

## GitHub workflow
The directory was not a Git repository, so no existing history/remotes were changed. Initialize Git locally, review `.gitignore`, commit, create/connect the intended GitHub repository, then enable Vercel Git integration. Do not commit `.env` files.

## Business discovery strategy
Use public source pages and user-verified listings from Index.ng, NaijaBased, and Novovibe. Save the originating URL and source for each record. Until terms/API/access limits are reviewed, use manual entry and CSV import. No Google Maps scraping or synthetic results.

## Outreach workflow
Select saved businesses with phone numbers, prepare the unchanged approved template, review it, open `wa.me` with the encoded message, then manually mark sent after sending. Record replies/status/notes/follow-up dates by hand. Opening WhatsApp is not represented as delivery. Opted-out records are excluded from queue fill.

## Security
No secrets in source. `.env*` is ignored except `.env.example`. Keep service-role key server-only. Use RLS, validation and owner scoping for production. Collect only lawful business contact information, retain source URLs, and honor opt-outs. Do not automate WhatsApp Web or claim messages are synchronized.

## External integrations
- Supabase: email Auth and business record CRUD are wired; project setup and hosted verification remain.
- GitHub: source hosting (no repository configured).
- Vercel: hosting (not deployed).
- WhatsApp: user-initiated official click-to-chat links only.
- Discovery sources: public directory links/manual verification; no connected collectors.

## Testing strategy
Five Node tests cover phone normalization, message personalization, duplicate matching, WhatsApp URL creation, and CSV parser behavior. On 2026-10-31, `npm test` passed (5/5), `npm run typecheck` passed, `npm run lint` passed, `npm run build` passed, and `npm audit` reported zero vulnerabilities. A production server smoke request returned HTTP 200 and included the app title and workspace. Interactive browser workflows and hosted integration still require external setup.

## Known decisions
The workspace runs without service credentials by using browser-local persistence. Cloud sync, auth and owner-isolated data require a configured Supabase project and have not been exercised against a live account. Queue membership stays in local browser storage; interaction timeline entries are not yet written to the interactions table. The approved message is stored verbatim in `src/lib/core.ts` with only the two name placeholders substituted.
