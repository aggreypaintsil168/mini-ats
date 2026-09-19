# Ledger — a mini ATS

A small, fast applicant tracking system: admins create accounts, customers post
jobs and run a Kanban pipeline over their candidates, and a stripped-down AI
feature gives a first-pass score of a résumé against a job description.

Live stack: **Next.js 16 (App Router, TypeScript) + Supabase (Postgres, Auth,
Row-Level Security, Storage) + Tailwind v4 + Claude (AI CV assessment)**,
deployable to **Vercel** in one click.

---

## 1. Why this stack

- **Supabase** was named in the brief, and it genuinely fits: Postgres +
  Auth + Row-Level-Security + Storage in one free-tier project means there's
  no separate auth service, no hand-rolled permissions layer, and no S3
  bucket to wire up for résumés. RLS policies (see `supabase/migrations/0001_init.sql`)
  do the "customers only see their own data" enforcement *in the database*,
  not just in application code — so even a bug in a page component can't leak
  another customer's candidates.
- **Next.js App Router + Server Actions** means one codebase serves both the
  UI and the backend "API." Mutations (`createJob`, `updateCandidateStage`,
  etc., in `src/lib/actions.ts`) run on the server, next to the Supabase
  client, with no separate REST/GraphQL layer to build or version.
- **Vercel** is the natural deploy target for Next.js — push to GitHub, import
  the repo, set a few environment variables, done. No servers to manage.
- **Claude (Anthropic API)** for the CV assessment, called directly from a
  server action so the API key never reaches the browser.

This is the same stack (and roughly the same build order) you'd get scaffolding
this with Cursor/Claude Code against a blank Next.js + Supabase starter — the
"use AI tools to build quickly" part of the brief mostly shows up in *how*
this was assembled (component-by-component, checked with a real build after
each piece) rather than in a different tech choice.

---

## 2. What's implemented

| Requirement | Where |
|---|---|
| Admin creates admin/customer accounts | `/admin` page, `createAccount` server action (uses Supabase's admin API + service role key) |
| Customer logs in | `/login`, Supabase Auth (email/password) |
| Customer posts jobs | `/jobs`, `createJob` action |
| Customer adds candidates (incl. LinkedIn) | `/candidates` → "Add candidate" dialog |
| Compact Kanban of candidates across all a customer's jobs | `/candidates` — 6-column drag-and-drop board (dnd-kit) |
| Filter Kanban by job and candidate name | Job dropdown + name search box above the board |
| Admin can do everything on a customer's behalf | "Acting as: [Customer]" switcher in the top nav — every create/filter action then behaves exactly as that customer |
| AI CV assessment | Candidate detail dialog → "Run assessment": scores 0–100 + a short explanation, using Claude (with a transparent keyword-overlap fallback if no API key is set, so the feature always works end-to-end) |

**Extras added beyond the brief**, because they're close to free once the
schema exists and matter a lot for a real first customer:
- Job statuses (open/draft/closed) with a dashboard rollup.
- Candidate count per job on the Jobs list.
- Recruiter notes per candidate, saved independently of stage.
- Résumé storage bucket wired up (private, per-authenticated-user read/write)
  for when you want to move from pasted résumé text to real file uploads.
- Optimistic drag-and-drop (the card moves instantly; it only snaps back if
  the server rejects the change), so the board feels instant even on a slow
  connection.

---

## 3. Project structure

```
supabase/migrations/0001_init.sql   # schema, enums, RLS policies, storage bucket
scripts/create-admin.mjs            # bootstraps the very first admin account
src/lib/supabase/client.ts          # browser Supabase client
src/lib/supabase/server.ts          # server Supabase client (cookie-scoped, RLS-respecting)
src/lib/supabase/admin.ts           # service-role client — server-only, used ONLY for account creation
src/lib/actions.ts                  # all server actions (auth, jobs, candidates, admin, AI)
src/lib/ai/assess.ts                # the AI CV assessment (Claude call + heuristic fallback)
src/middleware.ts                   # session refresh + route protection
src/app/(app)/...                   # authenticated app: jobs, candidates, admin
src/components/...                  # UI, organized by feature (jobs/candidates/admin/kanban)
```

---

## 4. Run it yourself — step by step

### Step 1: Create the Supabase project
1. Go to supabase.com → New project. Pick a region close to your customer.
   Save the database password somewhere safe.
2. In **Project Settings → API**, copy the **Project URL**, the **anon
   public** key, and the **service_role** key (keep the service role key
   secret — it bypasses all security rules).

**Why this step first:** everything else (the schema, the app's env vars,
the first admin account) depends on this project existing.

### Step 2: Run the database migration
1. In the Supabase dashboard, open **SQL Editor**.
2. Paste in the full contents of `supabase/migrations/0001_init.sql` and run it.

This creates the tables, the auto-profile trigger, every RLS policy, and the
`resumes` storage bucket in one shot. It's safe to re-run.

**Why a raw SQL file instead of the Supabase CLI:** it's one paste-and-run
step with no local CLI/Docker setup required, which matters when the goal is
"live for the first customer as fast as possible." (If you continue building
this, switching to `supabase db push` with the CLI is a good next step so
schema changes are tracked the same way as everything else.)

### Step 3: Configure environment variables
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from Step 1. Leave `ANTHROPIC_API_KEY` blank for
now if you don't have one yet — the AI feature will use its heuristic
fallback until you add one.

### Step 4: Install and run locally
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` — it'll bounce you to `/login`, because there
are no accounts yet.

### Step 5: Create the first admin account
Every account *after* this one is created from inside the app (`/admin`).
This first one has to be created directly against Supabase:
```bash
node --env-file=.env.local scripts/create-admin.mjs you@yourcompany.com "a-strong-password" "Your Name"
```
Log in with that email/password at `/login`. You're in as an admin — go to
`/admin` to create your first customer account, `/jobs` to post a role on
their behalf (use the "Acting as" switcher), and `/candidates` to try the
Kanban board.

### Step 6: (Optional but recommended) turn on real AI scoring
Get an API key from console.anthropic.com, add it as `ANTHROPIC_API_KEY` in
`.env.local` (and later in Vercel's env vars). Without it, "Run assessment"
still works — it just uses a transparent keyword-overlap heuristic instead
of a real model call, so the feature is demoable on day one either way.

### Step 7: Deploy to Vercel
1. Push this repo to GitHub (see below).
2. Go to vercel.com/new, import the repo.
3. Add the four environment variables from `.env.local` in the Vercel
   project settings (Environment Variables).
4. Deploy. Vercel gives you a `*.vercel.app` URL immediately; add a custom
   domain later if you want one.

**Why Vercel and not, say, a Docker container on a VM:** zero server
maintenance, automatic HTTPS, and it's built by the same team as Next.js, so
Server Actions and middleware work with no extra configuration. For a first
customer, "no infrastructure to babysit" is worth more than any flexibility
you'd get from self-hosting.

### Step 8: Push to your own GitHub
```bash
git init
git add -A
git commit -m "Initial commit: Ledger ATS"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/YOUR-REPO.git
git push -u origin main
```

---

## 5. How the "admin acts on a customer's behalf" requirement works

Rather than a separate "impersonation" login flow, the top nav has an
**"Acting as: [Customer]"** dropdown, visible only to admins. Selecting a
customer scopes the Jobs and Candidates pages to exactly that customer's
data, and any job or candidate created while "acting as" them is attached to
their account — so the admin uses the *same* forms a customer would use,
just with a different owner. Leaving it on "All customers" gives the admin
an oversight view across every customer at once (useful for support), and
job creation in that mode asks which customer the job belongs to inline.

This is enforced by the database, not just hidden in the UI: the RLS
policies allow a row's owner *or* an admin to read/write it, so even a
manually-crafted request can't let an admin (or anyone else) touch a
customer's data they haven't explicitly chosen to act on behalf of — and a
customer can never see another customer's rows, full stop.

---

## 6. The AI CV assessment — approach and reasoning

**What it does:** on a candidate's detail view, "Run assessment" sends the
job's title + description and the candidate's résumé text to Claude with a
system prompt asking for a 0–100 fit score and a 2–4 sentence explanation
citing specific résumé signals, then stores that score back on the
candidate row so it also shows as a small progress bar directly on the
Kanban card.

**Why this shape, for a first version:**
1. **Score + explanation, not a decision.** A recruiter should be able to
   see *why* a score landed where it did and disagree with it. An opaque
   number invites either blind trust or immediate distrust; a short,
   specific explanation is checkable.
2. **Paste-in résumé text, not file parsing, for v1.** Parsing PDFs/DOCX
   reliably (multi-column layouts, scanned images, etc.) is its own project.
   Storing plain text keeps the AI call trivial and correct on day one; the
   `resumes` storage bucket is already wired up so file upload + text
   extraction (e.g. via `pdf-parse` or an OCR step) is a contained follow-up
   task that doesn't touch the scoring logic at all.
3. **A working fallback, always.** If `ANTHROPIC_API_KEY` isn't set (or the
   API call fails), `src/lib/ai/assess.ts` falls back to a transparent
   keyword-overlap heuristic, so the feature is never a dead button in a
   demo — and the summary text says plainly when that's what happened.
4. **Scoped to one job at a time**, not a global candidate score. Fit is
   relative to a specific role's requirements, so the score is stored
   per-candidate (each candidate only belongs to one job here) with the job
   description as context, rather than trying to produce one score that
   means the same thing across every req.

**If I were pitching this to a boss as a next milestone**, I'd frame it in
three stages, in order:
1. **Ship the manual-paste version above** — proves the value (does this
   score correlate with recruiters' own gut checks?) with the least
   engineering risk.
2. **Add résumé file upload + text extraction**, so recruiters don't have to
   copy-paste — same scoring logic, new input path only.
3. **Only after 1–2 are validated**, consider batch scoring on upload,
   comparing candidates against each other rather than just against the job,
   or fine-tuning the prompt against hiring outcomes — each of those adds
   real complexity (cost control, evaluation, feedback loops) and isn't
   worth building until the simple version has proven useful.

---

## 7. Security notes

- The **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is used in exactly
  one file (`src/lib/supabase/admin.ts`), guarded by the `server-only`
  package so an accidental client-side import fails at build time, not at
  runtime in front of a customer.
- Every other read/write goes through the RLS-respecting server client, so
  Row Level Security — not application code — is the real security boundary.
- Accounts are created pre-confirmed by an admin (no public sign-up, no
  email-confirmation flow to configure for an MVP), matching "admin creates
  accounts" in the brief.

---

## 8. Known limitations / explicit assumptions

See `ASSUMPTIONS.md`.
