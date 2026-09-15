alter table public.live_events add column if not exists chat_enabled boolean not null default true;

drop function if exists public.verify_live_access(text,text);
drop function if exists public.request_live_access(text,text);

create function public.verify_live_access(p_slug text, p_token text)
returns table(live_id uuid, title text, description text, scheduled_at timestamptz, timezone text, status text, stream_provider text, stream_id text, chat_enabled boolean)
language sql security definer set search_path to 'public','pg_temp'
as $$
  select le.id, le.title, le.description, le.scheduled_at, le.timezone, le.status, le.stream_provider, le.stream_id, le.chat_enabled
  from public.live_events le join public.live_access_tokens lat on lat.live_event_id=le.id
  where le.slug=lower(trim(p_slug)) and lat.token_hash=p_token and lat.expires_at>now() and le.status<>'cancelled' limit 1;
$$;

grant execute on function public.verify_live_access(text,text) to anon, authenticated;

create function public.request_live_access(p_slug text, p_email text)
returns table(access_token text, live_id uuid, title text, description text, scheduled_at timestamptz, timezone text, stream_provider text, stream_id text, chat_enabled boolean)
language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare v_live public.live_events%rowtype; v_participant public.live_event_participants%rowtype; v_raw text;
begin
  select * into v_live from public.live_events where slug=lower(trim(p_slug)) and status<>'cancelled' limit 1;
  if v_live.id is null then return; end if;
  select * into v_participant from public.live_event_participants where live_event_id=v_live.id and lower(trim(email))=lower(trim(p_email)) limit 1;
  if v_participant.id is null then return; end if;
  v_raw := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from public.live_access_tokens where expires_at<now();
  insert into public.live_access_tokens(live_event_id,participant_id,token_hash,expires_at) values(v_live.id,v_participant.id,v_raw,now()+interval '7 days');
  update public.live_event_participants set status=case when status='invited' then 'registered' else status end, registered_at=coalesce(registered_at,now()) where id=v_participant.id;
  return query select v_raw,v_live.id,v_live.title,v_live.description,v_live.scheduled_at,v_live.timezone,v_live.stream_provider,v_live.stream_id,v_live.chat_enabled;
end;
$$;

grant execute on function public.request_live_access(text,text) to anon, authenticated;

create or replace function public.send_live_chat(p_slug text, p_token text, p_message text)
returns table(id uuid, sender_type text, sender_email text, message text, created_at timestamptz)
language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare v_live_id uuid; v_participant_id uuid; v_email text; v_org_id uuid; v_id uuid; v_chat_enabled boolean;
begin
  select le.id,p.email,p.organization_id,le.chat_enabled into v_live_id,v_email,v_org_id,v_chat_enabled
  from public.live_access_tokens lat join public.live_events le on le.id=lat.live_event_id join public.live_event_participants p on p.id=lat.participant_id
  where le.slug=lower(trim(p_slug)) and lat.token_hash=p_token and lat.expires_at>now() and le.status<>'cancelled' limit 1;
  if v_live_id is null then raise exception 'ACCESS_DENIED'; end if;
  if not coalesce(v_chat_enabled,true) then raise exception 'CHAT_DISABLED'; end if;
  if char_length(trim(p_message))<1 or char_length(p_message)>1000 then raise exception 'INVALID_MESSAGE'; end if;
  select p.id into v_participant_id from public.live_event_participants p where p.live_event_id=v_live_id and lower(p.email)=lower(v_email) limit 1;
  insert into public.live_event_messages(live_event_id,organization_id,sender_type,participant_id,sender_email,message) values(v_live_id,v_org_id,'attendee',v_participant_id,lower(v_email),trim(p_message)) returning live_event_messages.id into v_id;
  return query select m.id,m.sender_type,m.sender_email,m.message,m.created_at from public.live_event_messages m where m.id=v_id;
end;
$$;
