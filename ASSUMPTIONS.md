# Assumptions made while building this

Sent as the "email any assumptions" deliverable — grouped by why each call
was made, not just what was decided.

## Product shape

- **One candidate = one job.** In this model, someone applying to two roles
  at the same customer is two separate candidate records. This matches how
  small ATSs usually start (a "person" concept shared across jobs is a real
  feature, but it adds a whole dedup/merge story that isn't worth it before
  a first customer has validated the basics).
- **A customer account maps to one company.** There's no "team" concept yet
  — every user with role `customer` sees only the jobs/candidates tied to
  their own account. If your first customer has multiple recruiters who need
  shared access to the same jobs, the natural next step is a `company_id`
  that several `profiles` rows can share, rather than one account per
  company.
- **Six pipeline stages** (Applied → Screening → Interview → Offer → Hired /
  Rejected) as a sensible default recruiting funnel. This isn't
  customer-configurable yet; if your first customer's process doesn't match,
  the stage list is one array (`src/lib/stages.ts`) plus a Postgres enum to
  extend.
- **Candidates are added manually by the recruiter**, not sourced from a
  public "apply" page. Brief said "as a customer, I can add candidates," not
  "candidates can apply themselves," so there's no public job board or
  applicant-facing form in this version.

## Accounts and access

- **No public sign-up.** Every login is created by an admin, matching the
  brief exactly ("as an admin, I can create accounts") — there's deliberately
  no self-serve path.
- **Passwords are admin-set and shared out-of-band** (the admin picks a
  temporary password when creating an account and tells the customer
  directly). There's no "invite email with a set-password link" flow yet —
  that's a good fast-follow once you're past a single pilot customer, since
  right now it just adds an email-sending dependency (e.g. Resend/Postmark)
  for no benefit with one customer you're onboarding by hand.
- **Admin "acting as a customer"** is implemented as an explicit UI switcher
  plus permissive RLS, not session impersonation. An admin never "becomes"
  the customer (no separate token, no audit-log gap) — they simply act with
  their own admin identity against that customer's data, which is easier to
  reason about and to audit later if needed.

## Data and the AI feature

- **Résumé text is pasted in, not uploaded as a file**, for this version.
  See the README's AI section for the full reasoning — short version: it
  keeps the AI scoring correct and fast to ship, and file upload is a
  contained follow-up (the storage bucket already exists for it).
- **The AI score is advisory, not gating.** It never changes a candidate's
  stage or blocks any action — it's a number + explanation a recruiter can
  use or ignore.
- **No résumé data is used for anything beyond the assessment shown to the
  recruiter** — it isn't sent anywhere else, logged externally, or used to
  train anything.

## Infrastructure

- **I don't have a live URL or GitHub repo link to share yet** because I
  don't have credentials for a Supabase project, a Vercel account, or a
  GitHub org under your control. The repo is fully built, builds cleanly,
  and is ready to deploy in the ~15 minutes described in the README's
  step-by-step — happy to do that deployment myself on a call, or hand off
  the zipped repo for your own DevOps/engineer to push through those last
  steps if that's faster on your end.
- **Vercel + Supabase's free tiers** are assumed to be sufficient for a
  first customer (Supabase free tier: 500MB database, 1GB file storage,
  50,000 monthly active users; Vercel Hobby: generous bandwidth for a
  low-traffic internal tool). Worth revisiting pricing tiers once there's
  real usage.
