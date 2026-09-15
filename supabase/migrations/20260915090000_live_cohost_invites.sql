create table if not exists public.live_cohost_invites (
  id uuid primary key default gen_random_uuid(),
  live_id uuid not null references public.live_events(id) on delete cascade,
  organization_id uuid not null,
  token_hash text not null unique,
  created_by uuid null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists live_cohost_invites_live_id_idx on public.live_cohost_invites(live_id);
create index if not exists live_cohost_invites_expires_at_idx on public.live_cohost_invites(expires_at);
alter table public.live_cohost_invites enable row level security;

create or replace function public.create_live_cohost_invite(p_live_id uuid, p_organization_id uuid, p_token_hash text, p_expires_at timestamptz default (now() + interval '24 hours'))
returns table(id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare l public.live_events%rowtype; r public.live_cohost_invites%rowtype;
begin
  select * into l from public.live_events where id=p_live_id and organization_id=p_organization_id for update;
  if not found then raise exception 'LIVE_NOT_FOUND'; end if;
  if l.status in ('ended','cancelled') then raise exception 'LIVE_NOT_AVAILABLE'; end if;
  insert into public.live_cohost_invites(live_id,organization_id,token_hash,expires_at)
  values(p_live_id,p_organization_id,p_token_hash,least(p_expires_at, now()+interval '24 hours'))
  returning live_cohost_invites.id, live_cohost_invites.expires_at into r;
  return query select r.id,r.expires_at;
end; $$;
grant execute on function public.create_live_cohost_invite(uuid,uuid,text,timestamptz) to authenticated;

create or replace function public.consume_live_cohost_invite(p_token_hash text)
returns table(live_id uuid, organization_id uuid, title text, room_name text, stream_provider text, stream_id text)
language plpgsql security definer set search_path = public
as $$
declare r public.live_cohost_invites%rowtype; l public.live_events%rowtype;
begin
  select * into r from public.live_cohost_invites where token_hash = p_token_hash for update;
  if not found then raise exception 'INVALID_INVITE'; end if;
  if r.used_at is not null then raise exception 'INVITE_EXPIRED'; end if;
  if r.expires_at <= now() then raise exception 'INVITE_EXPIRED'; end if;
  select * into l from public.live_events where id = r.live_id for update;
  if not found then raise exception 'LIVE_NOT_FOUND'; end if;
  if l.status not in ('live','scheduled') then raise exception 'LIVE_NOT_AVAILABLE'; end if;
  update public.live_cohost_invites set used_at = now() where id = r.id;
  return query select l.id,l.organization_id,l.title,coalesce(l.stream_id,l.id::text),l.stream_provider,l.stream_id;
end; $$;
revoke all on function public.consume_live_cohost_invite(text) from public;
grant execute on function public.consume_live_cohost_invite(text) to anon, authenticated;
