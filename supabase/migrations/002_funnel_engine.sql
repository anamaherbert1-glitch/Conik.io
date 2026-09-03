create table if not exists public.funnel_pages (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  page_type text not null default 'landing' check (page_type in ('landing','checkout','thank-you','custom')),
  position integer not null default 0 check (position >= 0),
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (funnel_id, slug)
);

create table if not exists public.funnel_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.funnel_pages(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  html text not null default '',
  css text not null default '',
  js text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (page_id, version_number)
);

alter table public.funnel_pages
  drop constraint if exists funnel_pages_published_version_fk;
alter table public.funnel_pages
  add constraint funnel_pages_published_version_fk
  foreign key (published_version_id) references public.funnel_versions(id) on delete set null;

create table if not exists public.funnel_assets (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  version_id uuid references public.funnel_versions(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,
  created_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  page_id uuid references public.funnel_pages(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  success_action text not null default 'message' check (success_action in ('message','redirect')),
  success_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  name text not null check (name ~ '^[a-zA-Z0-9_]+$'),
  label text not null,
  field_type text not null default 'text' check (field_type in ('text','email','tel','number','textarea','select','checkbox')),
  required boolean not null default false,
  position integer not null default 0 check (position >= 0),
  options jsonb not null default '[]'::jsonb,
  unique (form_id, name)
);

create index if not exists idx_funnel_pages_funnel on public.funnel_pages(funnel_id, position);
create index if not exists idx_funnel_versions_page on public.funnel_versions(page_id, version_number desc);
create index if not exists idx_funnel_assets_funnel on public.funnel_assets(funnel_id);
create index if not exists idx_forms_funnel on public.forms(funnel_id);
create index if not exists idx_form_fields_form on public.form_fields(form_id, position);

create trigger funnel_pages_updated_at before update on public.funnel_pages for each row execute function public.set_updated_at();
create trigger forms_updated_at before update on public.forms for each row execute function public.set_updated_at();

alter table public.funnel_pages enable row level security;
alter table public.funnel_versions enable row level security;
alter table public.funnel_assets enable row level security;
alter table public.forms enable row level security;
alter table public.form_fields enable row level security;

create policy funnel_pages_member on public.funnel_pages for all to authenticated
using (exists (select 1 from public.funnels f where f.id = funnel_id and public.is_org_member(f.organization_id)))
with check (exists (select 1 from public.funnels f where f.id = funnel_id and public.is_org_member(f.organization_id)));

create policy funnel_versions_member on public.funnel_versions for all to authenticated
using (exists (select 1 from public.funnel_pages p join public.funnels f on f.id = p.funnel_id where p.id = page_id and public.is_org_member(f.organization_id)))
with check (exists (select 1 from public.funnel_pages p join public.funnels f on f.id = p.funnel_id where p.id = page_id and public.is_org_member(f.organization_id)));

create policy funnel_assets_member on public.funnel_assets for all to authenticated
using (exists (select 1 from public.funnels f where f.id = funnel_id and public.is_org_member(f.organization_id)))
with check (exists (select 1 from public.funnels f where f.id = funnel_id and public.is_org_member(f.organization_id)));

create policy forms_member on public.forms for all to authenticated
using (exists (select 1 from public.funnels f where f.id = funnel_id and public.is_org_member(f.organization_id)))
with check (exists (select 1 from public.funnels f where f.id = funnel_id and public.is_org_member(f.organization_id)));

create policy form_fields_member on public.form_fields for all to authenticated
using (exists (select 1 from public.forms x join public.funnels f on f.id = x.funnel_id where x.id = form_id and public.is_org_member(f.organization_id)))
with check (exists (select 1 from public.forms x join public.funnels f on f.id = x.funnel_id where x.id = form_id and public.is_org_member(f.organization_id)));

grant select, insert, update, delete on public.funnel_pages to authenticated;
grant select, insert, update, delete on public.funnel_versions to authenticated;
grant select, insert, update, delete on public.funnel_assets to authenticated;
grant select, insert, update, delete on public.forms to authenticated;
grant select, insert, update, delete on public.form_fields to authenticated;

create or replace function public.publish_funnel_page(target_page uuid, target_version uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.funnel_pages p
    join public.funnels f on f.id = p.funnel_id
    where p.id = target_page and public.is_org_member(f.organization_id)
  ) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.funnel_versions where id = target_version and page_id = target_page) then raise exception 'Invalid version'; end if;
  update public.funnel_pages set published_version_id = target_version where id = target_page;
end;
$$;

revoke all on function public.publish_funnel_page(uuid, uuid) from public;
grant execute on function public.publish_funnel_page(uuid, uuid) to authenticated;
