-- Policies RLS pour live_cohost_invites + renforcement de la RPC security definer

alter table public.live_cohost_invites enable row level security;

-- Lecture : membres de l’organisation
drop policy if exists live_cohost_invites_select_org on public.live_cohost_invites;
create policy live_cohost_invites_select_org
  on public.live_cohost_invites
  for select
  to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = live_cohost_invites.organization_id
        and m.user_id = auth.uid()
    )
  );

-- Insertion : owner / admin / editor de l’org
drop policy if exists live_cohost_invites_insert_editors on public.live_cohost_invites;
create policy live_cohost_invites_insert_editors
  on public.live_cohost_invites
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = live_cohost_invites.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- Mise à jour (marquer used_at) : via RPC de préférence ; policy pour membres org
drop policy if exists live_cohost_invites_update_org on public.live_cohost_invites;
create policy live_cohost_invites_update_org
  on public.live_cohost_invites
  for update
  to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = live_cohost_invites.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- RPC : ignorer RLS côté fonction (déjà security definer)
create or replace function public.create_live_cohost_invite(
  p_live_id uuid,
  p_organization_id uuid,
  p_token_hash text,
  p_expires_at timestamptz default (now() + interval '24 hours')
)
returns table(id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  l public.live_events%rowtype;
  r public.live_cohost_invites%rowtype;
  m public.organization_members%rowtype;
begin
  select * into m
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = auth.uid()
    and role in ('owner', 'admin', 'editor')
  limit 1;

  if not found then
    raise exception 'FORBIDDEN';
  end if;

  select * into l
  from public.live_events
  where id = p_live_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'LIVE_NOT_FOUND';
  end if;

  if l.status in ('ended', 'cancelled') then
    raise exception 'LIVE_NOT_AVAILABLE';
  end if;

  insert into public.live_cohost_invites (live_id, organization_id, token_hash, created_by, expires_at)
  values (
    p_live_id,
    p_organization_id,
    p_token_hash,
    auth.uid(),
    least(p_expires_at, now() + interval '24 hours')
  )
  returning live_cohost_invites.id, live_cohost_invites.expires_at into r;

  return query select r.id, r.expires_at;
end;
$$;

grant execute on function public.create_live_cohost_invite(uuid, uuid, text, timestamptz) to authenticated;
