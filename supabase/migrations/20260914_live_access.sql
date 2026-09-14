create table if not exists public.live_access_tokens (
  id uuid primary key default gen_random_uuid(),
  live_event_id uuid not null references public.live_events(id) on delete cascade,
  participant_id uuid not null references public.live_event_participants(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists live_access_tokens_live_idx on public.live_access_tokens(live_event_id);
create index if not exists live_access_tokens_expires_idx on public.live_access_tokens(expires_at);
alter table public.live_access_tokens enable row level security;
revoke all on public.live_access_tokens from anon, authenticated;
drop policy if exists live_access_tokens_org_access on public.live_access_tokens;
create policy live_access_tokens_org_access on public.live_access_tokens for all to authenticated using (exists (select 1 from public.live_events le where le.id=live_event_id and public.is_org_member(le.organization_id))) with check (exists (select 1 from public.live_events le where le.id=live_event_id and public.is_org_member(le.organization_id)));

create or replace function public.request_live_access(p_slug text,p_email text) returns table(access_token text,live_id uuid,title text,description text,scheduled_at timestamptz,timezone text,stream_provider text,stream_id text) language plpgsql security definer set search_path=public,pg_temp as $$
declare v_live public.live_events%rowtype; v_participant public.live_event_participants%rowtype; v_raw text;
begin
select * into v_live from public.live_events where slug=lower(trim(p_slug)) and status<>'cancelled' limit 1;
if v_live.id is null then return; end if;
select * into v_participant from public.live_event_participants where live_event_id=v_live.id and lower(trim(email))=lower(trim(p_email)) limit 1;
if v_participant.id is null then return; end if;
v_raw:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
delete from public.live_access_tokens where expires_at<now();
insert into public.live_access_tokens(live_event_id,participant_id,token_hash,expires_at) values(v_live.id,v_participant.id,v_raw,now()+interval '12 hours');
update public.live_event_participants set status=case when status='invited' then 'registered' else status end,registered_at=coalesce(registered_at,now()) where id=v_participant.id;
return query select v_raw,v_live.id,v_live.title,v_live.description,v_live.scheduled_at,v_live.timezone,v_live.stream_provider,v_live.stream_id;
end; $$;
grant execute on function public.request_live_access(text,text) to anon,authenticated;

create or replace function public.verify_live_access(p_slug text,p_token text) returns table(live_id uuid,title text,description text,scheduled_at timestamptz,timezone text,status text,stream_provider text,stream_id text) language sql security definer set search_path=public,pg_temp as $$
select le.id,le.title,le.description,le.scheduled_at,le.timezone,le.status,le.stream_provider,le.stream_id from public.live_events le join public.live_access_tokens lat on lat.live_event_id=le.id where le.slug=lower(trim(p_slug)) and lat.token_hash=p_token and lat.expires_at>now() and le.status<>'cancelled' limit 1;
$$;
grant execute on function public.verify_live_access(text,text) to anon,authenticated;
