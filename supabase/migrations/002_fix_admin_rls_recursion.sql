-- HOTFIX: repair admin RLS recursion in an already-deployed TalentFlow database.
-- Run this once in Supabase SQL Editor, then redeploy the application.

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
  );
$$;

create or replace function private.owns_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_admin())
      or exists (
        select 1 from public.profiles
        where id = (select auth.uid())
          and organization_id = target_org
      );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.owns_org(uuid) to authenticated;

-- Replace the recursive policies.
drop policy if exists "organization members may read their organization" on public.organizations;
drop policy if exists "admins manage organizations" on public.organizations;
drop policy if exists "people can read their profile; admins all" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "tenant jobs" on public.jobs;
drop policy if exists "tenant candidates" on public.candidates;
drop policy if exists "tenant applications" on public.applications;

create policy "organization members may read their organization" on public.organizations
  for select using ((select private.owns_org(id)));
create policy "admins manage organizations" on public.organizations
  for all using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "people can read their profile; admins all" on public.profiles
  for select using ((id = (select auth.uid())) or (select private.is_admin()));
create policy "admins manage profiles" on public.profiles
  for all using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "tenant jobs" on public.jobs
  for all using ((select private.owns_org(organization_id))) with check ((select private.owns_org(organization_id)));
create policy "tenant candidates" on public.candidates
  for all using ((select private.owns_org(organization_id))) with check ((select private.owns_org(organization_id)));
create policy "tenant applications" on public.applications
  for all using ((select private.owns_org(organization_id))) with check ((select private.owns_org(organization_id)));

-- Optional cleanup: the old public helper functions are no longer referenced.
-- Leave them in place if your project has other dependencies on them.
