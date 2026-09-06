drop policy if exists organizations_update_admin on public.organizations;

create policy organizations_update_admin on public.organizations
for update to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
