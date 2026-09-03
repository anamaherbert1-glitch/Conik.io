-- Workspace authorization hardening.
-- Membership is the source of truth for tenant access and roles.

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- A member must not be able to add themselves to an arbitrary organization.
-- Workspace creation remains available through create_organization(), which
-- performs the owner insert inside its trusted transaction.
drop policy if exists members_insert_admin on public.organization_members;
create policy members_insert_admin on public.organization_members
for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner', 'admin']::text[])
);

-- Owners/admins can manage organization membership. A member cannot grant
-- themselves a stronger role or move another user into a tenant.
drop policy if exists members_update_admin on public.organization_members;
create policy members_update_admin on public.organization_members
for update to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']::text[]))
with check (public.has_org_role(organization_id, array['owner', 'admin']::text[]));

drop policy if exists members_delete_admin on public.organization_members;
create policy members_delete_admin on public.organization_members
for delete to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']::text[]));

-- Prevent accidental duplicate workspaces from repeated onboarding submissions
-- for the same user. Existing organizations are untouched.
create or replace function public.create_organization(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  clean_name text := trim(org_name);
  clean_slug text := lower(trim(org_slug));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then raise exception 'Invalid organization name'; end if;
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organization slug'; end if;

  if exists (
    select 1 from public.organization_members
    where user_id = auth.uid()
  ) then
    raise exception 'Workspace already exists for this account';
  end if;

  insert into public.organizations(name, slug)
  values (clean_name, clean_slug)
  returning id into new_org_id;

  insert into public.organization_members(organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;
