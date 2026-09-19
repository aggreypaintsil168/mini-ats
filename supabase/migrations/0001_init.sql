-- ============================================================================
-- Mini ATS — initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`) on a fresh
-- project. Safe to run once. See README.md for full setup instructions.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type public.user_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum ('open', 'closed', 'draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.candidate_stage as enum (
    'applied', 'screening', 'interview', 'offer', 'hired', 'rejected'
  );
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
-- One row per auth.users row. Created automatically by a trigger (below)
-- whenever a new user is created via Supabase Auth (including via the
-- admin API, which is how this app creates accounts).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text not null default '',
  company_name text,
  created_at timestamptz not null default now()
);

-- ---------- jobs ----------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  department text,
  location text,
  description text,
  status public.job_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- candidates ----------
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  linkedin_url text,
  resume_url text,
  resume_text text,
  stage public.candidate_stage not null default 'applied',
  notes text,
  ai_score int check (ai_score between 0 and 100),
  ai_summary text,
  ai_assessed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidates_job_id_idx on public.candidates (job_id);
create index if not exists jobs_customer_id_idx on public.jobs (customer_id);

-- ---------- updated_at trigger helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

drop trigger if exists candidates_set_updated_at on public.candidates;
create trigger candidates_set_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

-- ---------- auto-create profile on signup ----------
-- Reads role/full_name/company_name out of the auth user's metadata, which
-- the admin "create account" API sets at creation time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, company_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'company_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- helper: is the current user an admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;

-- profiles: everyone can read their own row; admins can read/update everyone
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- jobs: a customer sees/manages only their own jobs; an admin sees/manages all
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs
  for select using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_insert" on public.jobs;
create policy "jobs_insert" on public.jobs
  for insert with check (customer_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_update" on public.jobs;
create policy "jobs_update" on public.jobs
  for update using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_delete" on public.jobs;
create policy "jobs_delete" on public.jobs
  for delete using (customer_id = auth.uid() or public.is_admin());

-- candidates: scoped through the parent job's owner
drop policy if exists "candidates_select" on public.candidates;
create policy "candidates_select" on public.candidates
  for select using (
    public.is_admin() or
    exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
  );

drop policy if exists "candidates_insert" on public.candidates;
create policy "candidates_insert" on public.candidates
  for insert with check (
    public.is_admin() or
    exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
  );

drop policy if exists "candidates_update" on public.candidates;
create policy "candidates_update" on public.candidates
  for update using (
    public.is_admin() or
    exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
  );

drop policy if exists "candidates_delete" on public.candidates;
create policy "candidates_delete" on public.candidates
  for delete using (
    public.is_admin() or
    exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
  );

-- ============================================================================
-- Storage bucket for résumé uploads
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "resumes_read" on storage.objects;
create policy "resumes_read" on storage.objects
  for select using (bucket_id = 'resumes' and auth.role() = 'authenticated');

drop policy if exists "resumes_write" on storage.objects;
create policy "resumes_write" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.role() = 'authenticated');

drop policy if exists "resumes_update" on storage.objects;
create policy "resumes_update" on storage.objects
  for update using (bucket_id = 'resumes' and auth.role() = 'authenticated');
