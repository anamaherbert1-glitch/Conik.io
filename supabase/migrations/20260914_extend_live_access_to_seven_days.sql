create or replace function public.request_live_access(p_slug text, p_email text)
returns table(access_token text, live_id uuid, title text, description text, scheduled_at timestamptz, timezone text, stream_provider text, stream_id text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_live public.live_events%rowtype;
  v_participant public.live_event_participants%rowtype;
  v_raw text;
begin
  select * into v_live
  from public.live_events
  where slug = lower(trim(p_slug))
    and status <> 'cancelled'
  limit 1;

  if v_live.id is null then return; end if;

  select * into v_participant
  from public.live_event_participants
  where live_event_id = v_live.id
    and lower(trim(email)) = lower(trim(p_email))
  limit 1;

  if v_participant.id is null then return; end if;

  v_raw := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from public.live_access_tokens where expires_at < now();
  insert into public.live_access_tokens(live_event_id,participant_id,token_hash,expires_at)
  values(v_live.id,v_participant.id,v_raw,now()+interval '7 days');

  update public.live_event_participants
  set status = case when status='invited' then 'registered' else status end,
      registered_at = coalesce(registered_at,now())
  where id = v_participant.id;

  return query select v_raw,v_live.id,v_live.title,v_live.description,v_live.scheduled_at,v_live.timezone,v_live.stream_provider,v_live.stream_id;
end;
$$;

grant execute on function public.request_live_access(text,text) to anon, authenticated;
revoke execute on function public.request_live_access(text,text) from public;
