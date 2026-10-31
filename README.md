# MB CoreX Leads

Private business discovery and outreach workspace for MB CoreX Software Company.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The current UI saves records in this browser's local storage. For checks, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Features

- Business records with status, source, contact data, notes and follow-up date.
- Search, filtering, duplicate checks and CSV import/export, JSON/XML export.
- Discovery links for Index.ng, NaijaBased and Novovibe; unverified automated collection is not enabled.
- Approved message preview/copy and manual WhatsApp click-to-chat queue.
- Manual CRM status and follow-up tracking; analytics from saved records.

## Supabase

Create a project and run `supabase/migrations/202610310001_initial_schema.sql` in its SQL editor (or through the Supabase CLI). Enable email sign-in in Supabase Auth. Copy `.env.example` to `.env.local` and set the project URL and anon key. The app then presents sign-in/sign-up and synchronizes business CRUD through owner-scoped RLS. Never put the service role key in browser code. Without these values, the app uses browser local storage. Existing local records are not automatically migrated; export CSV/JSON and import after signing in.

## GitHub and Vercel

The local Git repository is initialized on branch `main` and has no commit or remote. Create an empty private repository on GitHub, then connect and push:

```bash
git add .
git commit -m "Build MB CoreX Leads workspace"
git remote add origin https://github.com/<your-account>/<your-repository>.git
git push -u origin main
```

Import that repository from the Vercel dashboard, select the `main` branch, and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under Project Settings → Environment Variables for Preview and Production. Redeploy after setting them. Vercel detects Next.js and uses `npm run build`. Add a custom domain in the Vercel project later if needed. Never commit `.env.local`.

**Plan note (checked 2026-10-31):** GitHub Free supports private repositories. Supabase currently lists a $0 Free plan, but free projects pause after one week of inactivity and have limited quota. Vercel Hobby is restricted to personal, non-commercial use; because this is an MB CoreX business tool, use Vercel Pro for production (currently listed at $20/month, before taxes/usage adjustments). Recheck [GitHub](https://github.com/pricing), [Supabase](https://supabase.com/pricing), and [Vercel](https://vercel.com/pricing) pricing before choosing a plan.

## Sources and limitations

Sources: https://index.ng/, https://www.naijabased.fun/, https://novovibe.com/en/nigeria. Verify each source's current terms and robots/rate limits before building a collector. Manual import is available. WhatsApp only opens an official `wa.me` click-to-chat link; sending and replies remain manual.

See [MBCOREXLEADS_PROJECT.md](./MBCOREXLEADS_PROJECT.md) and [MBCOREXLEADS_IMPLEMENTATION_PLAN.md](./MBCOREXLEADS_IMPLEMENTATION_PLAN.md) for architecture, progress and deployment details.
