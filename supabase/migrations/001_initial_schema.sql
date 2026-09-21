-- TalentFlow: multi-tenant ATS schema. Apply in Supabase SQL Editor or `supabase db push`.
create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'customer');
create type public.application_stage as enum ('applied', 'screen', 'interview', 'offer', 'hired', 'rejected');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  department text,
  location text,
  employment_type text,
  description text,
  status text not null default 'open' check (status in ('open', 'closed', 'draft')),
  created_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  linkedin_url text,
  headline text,
  cv_text text,
  ai_assessment jsonb,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  stage public.application_stage not null default 'applied',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id, job_id)
);

create index jobs_organization_idx on public.jobs(organization_id);
create index candidates_organization_idx on public.candidates(organization_id);
create index applications_org_stage_idx on public.applications(organization_id, stage);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.owns_org(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and organization_id = target_org) $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger applications_updated_at before update on public.applications for each row execute function public.touch_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;

create policy "organization members may read their organization" on public.organizations for select using (public.owns_org(id));
create policy "admins manage organizations" on public.organizations for all using (public.is_admin()) with check (public.is_admin());
create policy "people can read their profile; admins all" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "tenant jobs" on public.jobs for all using (public.owns_org(organization_id)) with check (public.owns_org(organization_id));
create policy "tenant candidates" on public.candidates for all using (public.owns_org(organization_id)) with check (public.owns_org(organization_id));
create policy "tenant applications" on public.applications for all using (public.owns_org(organization_id)) with check (public.owns_org(organization_id));

-- First-user bootstrap (run once after creating your auth user in Supabase dashboard):
-- insert into public.organizations (name) values ('TalentFlow Demo') returning id;
-- insert into public.profiles (id, organization_id, full_name, role)
-- values ('c73f77a9-3353-4401-b8dd-ef7ca217f035', 'c4569cc0-df25-4c97-9be3-022ac68a86d4', 'Aggrey Ishmeal', 'admin');
