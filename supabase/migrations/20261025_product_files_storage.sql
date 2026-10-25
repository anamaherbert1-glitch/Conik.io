insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', true)
on conflict (id) do nothing;

drop policy if exists product_files_insert_member on storage.objects;
create policy product_files_insert_member on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-files');

drop policy if exists product_files_update_member on storage.objects;
create policy product_files_update_member on storage.objects
  for update to authenticated
  using (bucket_id = 'product-files');

drop policy if exists product_files_select_public on storage.objects;
create policy product_files_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-files');

select 'product-files bucket OK' as status;
