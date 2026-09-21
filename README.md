# TalentFlow — mini ATS

A fast, customer-ready applicant tracking system: customer login, jobs, candidates, a compact Kanban funnel, filters, admin-managed customer accounts, and an optional CV assessment assistant.

## Why this stack

**Next.js 15 + TypeScript** delivers a polished product with one codebase: server-side data access and browser interactions together. **Supabase** is the right MVP backend because it combines password authentication, Postgres, and database-enforced Row Level Security (RLS). The RLS policies are important: a hidden UI filter is not a security boundary; policies prevent one customer reading another customer’s applicants even if they call the API directly. **Vercel** is the shortest reliable route to production.

## What is implemented

- Customer authentication via Supabase.
- Customers post jobs and add candidates (including LinkedIn URL, profile notes, and CV text).
- Candidate creation automatically creates an application in the `Applied` Kanban column.
- Compact five-stage board with candidate-name and job filters; each card advances through the funnel.
- Admins see customer accounts, create a customer organization + first login, and can switch the dashboard to any customer by adding `?org=<organization-id>` to `/dashboard`.
- Optional OpenAI-backed CV assessment, with a deterministic keyword-match fallback so the product remains useful without an API key.

## Start here: clone and run locally

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd talentflow-ats
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It will not be able to log in until the next Supabase setup step is complete.

## Supabase setup

1. Create a new Supabase project. This keeps the customer database and authentication under one managed service.
2. In **SQL Editor**, run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql). It creates the tables, indexes, application stages, and the RLS policies.
3. In **Authentication → Users**, create your first user (your admin email and a strong password).
4. In **Project Settings → API**, copy the project URL, anon key, and service-role key to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
OPENAI_API_KEY=optional
```

The service-role key is only read on the server (first-user setup and admin account creation). Never prefix it with `NEXT_PUBLIC_` and never commit `.env.local`.

5. Restart `npm run dev` and sign in. The first Auth user is promoted to admin automatically. To do it from the terminal instead: `npm run bootstrap`.
6. Visit **Accounts** and create your first customer. Then add a job and candidate from the dashboard.

## The AI assessment: credible MVP approach

The sparkles button on a candidate card evaluates their stored CV text against their linked job title/brief. With `OPENAI_API_KEY`, it asks a small model for a structured score, short rationale, strengths, and gaps; the result is saved in `candidates.ai_assessment`. Without a key, the fallback illustrates the same workflow with transparent keyword overlap.

For a customer demonstration, describe it as **decision support, not automated rejection**. Keep a recruiter in the loop, show the evidence/summary, avoid protected-characteristic inference, and log the model version and score later as the feature matures. That framing is both more useful and safer than selling “AI hiring decisions.”

## Deployment to Vercel

1. Create a GitHub repository and push this folder.
2. Import the repository into Vercel; it detects Next.js automatically.
3. Add the four environment variables above in **Vercel → Project Settings → Environment Variables**. Use the production Supabase project values.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel URL. Add `http://localhost:3000` as a development redirect URL.
5. Deploy. Sign in with the bootstrap admin account and create a throwaway customer to test data isolation before inviting a real customer.

## Suggested five-minute demo sequence

1. Sign in as admin; show **Accounts** and create “Acme Ltd”.
2. Open its dashboard; post “Senior Product Designer”.
3. Add a candidate with a LinkedIn URL and CV summary.
4. Filter to the job, move the candidate through the board, and click the assessment sparkle.
5. Explain the RLS tenant isolation and the recruiter-in-the-loop AI guardrail.

## What I would add next

Candidate detail pages, CV file storage in Supabase Storage, notes/activities, email invitations instead of temporary passwords, audit trails, configurable stages, and a proper admin organization switcher are the sensible next increments after the first customer validates the workflow.
