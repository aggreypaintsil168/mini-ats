# TalentFlow — Mini Applicant Tracking System (ATS)

TalentFlow is a lightweight, multi-tenant Applicant Tracking System built as an MVP for a first customer. It covers the core recruiting workflow requested in the assessment: administrator account provisioning, customer login, job creation, candidate management, a compact Kanban pipeline, filtering, administrator access to customer pipelines, and a stripped-down AI-assisted CV assessment feature.

## Live application

**Production:** `https://mini-a47kdmtpf-aggreypaintsil168s-projects.vercel.app`

The application is deployed on Vercel and uses Supabase for authentication and PostgreSQL data storage.

> The production deployment currently has an admin-only database-policy issue being fixed by the SQL hotfix in `supabase/migrations/002_fix_admin_rls_recursion.sql`. The root cause is described below.

## Assessment requirements vs implementation

| Requirement | Status | Implementation |
|---|---|---|
| Admin can create admin accounts | Implemented | Supabase Auth Admin API + `profiles` role = `admin` |
| Admin can create customer accounts | Implemented | Creates a customer organization, Auth user and profile together |
| Customer can log in | Implemented | Supabase email/password authentication |
| Customer can post jobs | Implemented | Job creation modal with title, department, location, employment type and role brief |
| Customer can add candidates | Implemented | Candidate profile with name, email, LinkedIn URL, headline/notes and optional CV text |
| Customer can see a compact Kanban | Implemented | Applied → Screen → Interview → Offer → Hired, plus Archived/Rejected |
| Filter by job | Implemented | Job selector above the Kanban |
| Filter by candidate name | Implemented | Client-side name search |
| Admin can act on behalf of customers | Implemented | Admin organization switcher + same dashboard controls |
| Supabase backend | Implemented | Supabase Auth, PostgreSQL and RLS |
| AI CV assessment | Implemented (MVP) | OpenAI assessment when configured; deterministic keyword fallback otherwise |
| Live URL | Implemented | Vercel production deployment |
| Repository | Implemented | GitHub repository contains source, schema, scripts and documentation |
| Five-minute demo video | Not included in repository README | To be recorded separately |
| Email with assumptions | Not yet delivered | To be sent separately with the demo |

## What is currently implemented

### Authentication and authorization

- Supabase email/password authentication.
- Middleware refreshes the Supabase session.
- Role-based access through `profiles.role`: `admin` or `customer`.
- Customers are associated with an organization.
- Administrators can operate across customer organizations.
- Database-level Row Level Security (RLS) protects tenant data instead of relying only on UI filters.

### Administrator workspace

- `/admin` provides account provisioning.
- Admin can create a customer account with:
  - company/organization name
  - contact name
  - email
  - temporary password
- Admin can also create another administrator account.
- Existing accounts are listed with their role and organization.
- Admins can switch between customer organizations from the main pipeline.

### Customer/recruiter workflow

- Post an open job.
- Capture job title, department, location, employment type and role brief.
- Add a candidate directly to a selected job.
- Store candidate name, email, LinkedIn URL, headline/profile notes and pasted CV text.
- Candidate automatically enters the `Applied` stage.
- Advance candidates through the recruiting funnel with one-click movement.
- Filter the board by job and candidate name.

### AI-assisted candidate assessment

The candidate card has an assessment action. The current MVP works in two modes:

1. **OpenAI mode:** if `OPENAI_API_KEY` is configured, the server sends the candidate CV/profile text and linked job brief to the OpenAI Responses API and stores a structured assessment containing a score, summary, strengths and gaps.
2. **Fallback mode:** without an OpenAI key, a deterministic keyword-overlap assessment is generated locally. This keeps the demo functional without requiring an external AI key.

The feature is intentionally positioned as **recruiter decision support**, not an automated hiring/rejection system. It does not intentionally infer protected characteristics.

## Current data model

The Supabase database contains:

- `organizations` — customer/company tenants.
- `profiles` — application users, roles and organization membership.
- `jobs` — recruiting roles belonging to an organization.
- `candidates` — candidate profiles and stored AI assessment.
- `applications` — candidate-to-job relationship, pipeline stage and notes.

The application uses UUID primary keys and indexes organization/stage fields for the main tenant and Kanban queries.

## Security architecture

The browser uses the Supabase publishable/anon key; elevated account creation uses `SUPABASE_SERVICE_ROLE_KEY` only on the server. The service-role credential is never prefixed with `NEXT_PUBLIC_` and must never be committed to GitHub. Supabase documents that service/secret keys bypass RLS and therefore must remain server-side.

RLS is enabled on the application tables. The original implementation used `public.is_admin()` and `public.owns_org()` inside RLS policies, while those functions queried `profiles`, which itself had an RLS policy calling `is_admin()`. That creates a recursive policy path for administrator queries.

The corrected implementation moves the authorization helpers into a non-exposed `private` schema and uses `SECURITY DEFINER` functions to inspect `profiles` without recursively re-entering the same policy. This follows Supabase's documented pattern for breaking RLS recursion.

### Important production fix

If the original database migration has already been run, execute this file **once** in Supabase SQL Editor:

`supabase/migrations/002_fix_admin_rls_recursion.sql`

Then redeploy the latest code to Vercel.

After applying the hotfix, test:

1. Admin login.
2. `/admin`.
3. Create a customer account.
4. Create another admin account.
5. Switch to the new customer organization.
6. Create a job and candidate.
7. Log in as the customer and verify that only that customer's data is visible.

## Environment variables

Create `.env.local` locally and configure the same values in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
OPENAI_API_KEY=optional
```

`OPENAI_API_KEY` is optional because the application has a deterministic fallback assessment.

## Local development

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd mini-ats-main
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run dev
npm run build
npm run typecheck
npm run bootstrap
```

## Supabase setup for a fresh project

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor.
3. Create the first Auth user in Supabase Authentication.
4. Configure the environment variables.
5. Run `npm run bootstrap` locally, or use the application bootstrap flow if present in the deployment.
6. Sign in as the first admin.
7. Open **Accounts** and create a customer.
8. Switch into the customer organization and test the complete recruiting workflow.

## Deployment

The application is designed for Vercel + Supabase.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Configure the four environment variables in Vercel.
4. Deploy.
5. In Supabase Authentication URL Configuration, set the production Site URL to the Vercel deployment and add the local development URL where appropriate.
6. Run the RLS hotfix in production if the database was created using the original migration.
7. Test with a throwaway customer before sharing production credentials.

## Known limitations at this stage

These are intentionally outside the minimum viable assessment scope or are still planned:

- No CV file upload/storage yet; CV content is currently pasted into a text field.
- No candidate detail/profile page yet.
- No recruiter notes/activity timeline beyond the database field prepared for application notes.
- No email invitation/reset-password workflow; account provisioning currently uses a temporary password.
- No configurable/custom pipeline stages.
- No audit log for administrative actions.
- No calendar/interview scheduling.
- No bulk candidate import.
- No automated email notifications.
- AI assessment is a lightweight MVP and should not be treated as a validated hiring model.
- The admin organization switcher is functional but intentionally simple rather than a full organization-management interface.
- Error reporting in production can still be improved with a dedicated logging/observability service.

## What I would build next

If the first-customer workflow validates the product, the next increments would be:

1. Candidate detail page with complete profile, CV, notes and activity history.
2. Supabase Storage for uploaded CV PDFs/DOCX files and server-side text extraction.
3. Email invitations and password-reset/onboarding flows.
4. Audit trail for account, candidate, job and stage changes.
5. Configurable pipeline stages per customer.
6. Better AI assessment with structured job requirements, evidence citations from the CV, model/version logging and evaluation against recruiter-labelled examples.
7. Recruiter collaboration, comments and notifications.
8. Search, bulk import/export and reporting.

## Reasonable product assumptions

- A customer represents one recruiting company/organization.
- A candidate can be associated with multiple jobs, represented by separate `applications`.
- Administrators are platform-level users and can work on behalf of any customer.
- The first release prioritizes the core recruiting workflow over advanced HR features.
- Temporary passwords are acceptable for an assessment/demo environment; a production onboarding flow should use invitations or password setup links.
- AI output is advisory and must be reviewed by a human recruiter.

## Repository structure

```text
mini-ats-main/
├── app/
│   ├── admin/              # Admin account management
│   ├── dashboard/          # Main recruiter pipeline
│   ├── components/         # Kanban, modals, topbar, organization switcher
│   ├── actions.ts          # Server-side mutations and AI assessment
│   ├── login/              # Authentication UI
│   └── error.tsx           # Production error boundary
├── lib/
│   ├── bootstrap.ts
│   ├── supabase/           # Browser/server/middleware clients
│   └── types.ts
├── scripts/                # Bootstrap and Supabase diagnostics
├── supabase/
│   └── migrations/         # Database schema + production RLS hotfix
├── .env.example
├── package.json
└── README.md
```

## Delivery status

### Ready / implemented

- Live Vercel deployment
- GitHub repository
- Supabase authentication
- Supabase PostgreSQL schema
- Multi-tenant RLS design
- Admin account management
- Customer login
- Job creation
- Candidate creation
- Kanban pipeline
- Job/name filtering
- Admin organization switching
- AI CV assessment MVP
- Local fallback assessment
- Deployment and bootstrap scripts

### Still to deliver separately

- Five-minute demo recording
- Email to the prospective employer explaining assumptions and delivery notes
- Final production credentials/admin access hand-off

## Final pre-handoff checklist

- [ ] Run `002_fix_admin_rls_recursion.sql` in production Supabase.
- [ ] Redeploy to Vercel.
- [ ] Verify admin `/admin` loads without a server error.
- [ ] Create a customer account.
- [ ] Create a second admin account.
- [ ] Create a job.
- [ ] Add a candidate with LinkedIn URL and CV text.
- [ ] Move the candidate through the Kanban.
- [ ] Run the AI assessment.
- [ ] Log in as the customer and verify tenant isolation.
- [ ] Verify no service-role key exists in Git history or client-side code.
- [ ] Record the five-minute demo separately.
- [ ] Send the assumptions/delivery email separately.
