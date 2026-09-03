create table if not exists public.funnel_versions (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.funnel_pages(id) on delete cascade,
  version_number integer not null check(version_number > 0), html text not null default '', css text not null default '', js text not null default '',
  metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique(page_id, version_number)
);

alter table public.funnel_pages add column if not exists name text;
alter table public.funnel_pages add column if not exists published_version_id uuid;
update public.funnel_pages set name = coalesce(nullif(title,''), 'Page ' || position::text) where name is null;
alter table public.funnel_pages alter column name set not null;

alter table public.funnel_pages drop constraint if exists funnel_pages_published_version_fk;
alter table public.funnel_pages add constraint funnel_pages_published_version_fk foreign key(published_version_id) references public.funnel_versions(id) on delete set null;

create index if not exists idx_funnel_versions_page on public.funnel_versions(page_id, version_number desc);
alter table public.funnel_versions enable row level security;
drop policy if exists funnel_versions_member on public.funnel_versions;
create policy funnel_versions_member on public.funnel_versions for all to authenticated
using (exists(select 1 from public.funnel_pages p join public.funnels f on f.id=p.funnel_id where p.id=page_id and public.is_org_member(f.organization_id)))
with check (exists(select 1 from public.funnel_pages p join public.funnels f on f.id=p.funnel_id where p.id=page_id and public.is_org_member(f.organization_id)));
grant select,insert,update,delete on public.funnel_versions to authenticated;

create or replace function public.publish_funnel_page(target_page uuid,target_version uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target_funnel uuid; target_org uuid;
begin
 select p.funnel_id into target_funnel from public.funnel_pages p where p.id=target_page;
 select organization_id into target_org from public.funnels where id=target_funnel;
 if target_org is null or not public.is_org_member(target_org) then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.funnel_versions where id=target_version and page_id=target_page) then raise exception 'Invalid version'; end if;
 update public.funnel_pages set published_version_id=target_version where id=target_page;
 update public.funnels set status='published' where id=target_funnel;
end; $$;
revoke all on function public.publish_funnel_page(uuid,uuid) from public;
grant execute on function public.publish_funnel_page(uuid,uuid) to authenticated;

create or replace function public.get_published_funnel_page(target_funnel_slug text,target_page_slug text default 'home')
returns table(funnel_id uuid,funnel_name text,funnel_slug text,page_id uuid,page_name text,page_slug text,page_type text,version_id uuid,html text,css text,js text,metadata jsonb)
language sql security definer stable set search_path=public as $$
 select f.id,f.name,f.slug,p.id,p.name,p.slug,p.page_type,v.id,v.html,v.css,v.js,v.metadata
 from public.funnels f join public.funnel_pages p on p.funnel_id=f.id join public.funnel_versions v on v.id=p.published_version_id
 where f.slug=lower(trim(target_funnel_slug)) and p.slug=lower(trim(coalesce(target_page_slug,'home'))) and f.status='published' and p.published_version_id is not null;
$$;
revoke all on function public.get_published_funnel_page(text,text) from public;
grant execute on function public.get_published_funnel_page(text,text) to anon,authenticated;
