create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  source text not null default 'manual' check (source in ('manual','import','ai')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text,
  phone text,
  first_name text,
  last_name text,
  source text,
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_funnels_org on public.funnels(organization_id);
create index if not exists idx_contacts_org on public.contacts(organization_id);
create index if not exists idx_contacts_email on public.contacts(organization_id, email);
create index if not exists idx_contacts_phone on public.contacts(organization_id, phone);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.funnels enable row level security;
alter table public.contacts enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
for select to authenticated using (public.is_org_member(id));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
for update to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = auth.uid() and m.role in ('owner','admin'))
) with check (public.is_org_member(id));

drop policy if exists members_select_self_or_org on public.organization_members;
create policy members_select_self_or_org on public.organization_members
for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists members_insert_admin on public.organization_members;
create policy members_insert_admin on public.organization_members
for insert to authenticated with check (
  user_id = auth.uid() or exists (select 1 from public.organization_members m where m.organization_id = organization_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);

drop policy if exists funnels_all_member on public.funnels;
create policy funnels_all_member on public.funnels
for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists contacts_all_member on public.contacts;
create policy contacts_all_member on public.contacts
for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

grant select, update on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;
grant select, insert, update, delete on public.funnels to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;

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

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists funnels_updated_at on public.funnels;
create trigger funnels_updated_at before update on public.funnels for each row execute function public.set_updated_at();
drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();
