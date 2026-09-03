alter table public.funnel_assets add column if not exists version_id uuid references public.funnel_versions(id) on delete cascade;
alter table public.funnel_assets add column if not exists original_name text;
alter table public.funnel_assets add column if not exists mime_type text;
alter table public.funnel_assets add column if not exists sha256 text;

update public.funnel_assets set original_name = coalesce(original_name, storage_path) where original_name is null;
update public.funnel_assets set mime_type = coalesce(mime_type, file_type, 'application/octet-stream') where mime_type is null;

create index if not exists idx_funnel_assets_version on public.funnel_assets(version_id);

insert into storage.buckets (id, name, public)
values ('funnel-assets', 'funnel-assets', true)
on conflict (id) do update set public = true;

drop policy if exists funnel_assets_upload on storage.objects;
drop policy if exists funnel_assets_update on storage.objects;
drop policy if exists funnel_assets_delete on storage.objects;
drop policy if exists funnel_assets_read on storage.objects;

create policy funnel_assets_upload on storage.objects for insert to authenticated
with check (bucket_id = 'funnel-assets' and public.is_org_member((split_part(name, '/', 1))::uuid));

create policy funnel_assets_update on storage.objects for update to authenticated
using (bucket_id = 'funnel-assets' and public.is_org_member((split_part(name, '/', 1))::uuid))
with check (bucket_id = 'funnel-assets' and public.is_org_member((split_part(name, '/', 1))::uuid));

create policy funnel_assets_delete on storage.objects for delete to authenticated
using (bucket_id = 'funnel-assets' and public.is_org_member((split_part(name, '/', 1))::uuid));

create policy funnel_assets_read on storage.objects for select to public
using (bucket_id = 'funnel-assets');
