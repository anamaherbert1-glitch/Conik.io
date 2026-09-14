create or replace function public.send_live_chat(p_slug text, p_token text, p_message text)
returns table(id uuid, sender_type text, sender_email text, message text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_live_id uuid;
  v_participant_id uuid;
  v_email text;
  v_org_id uuid;
  v_id uuid;
begin
  select le.id, p.email, p.organization_id
    into v_live_id, v_email, v_org_id
  from public.live_access_tokens lat
  join public.live_events le on le.id = lat.live_event_id
  join public.live_event_participants p on p.id = lat.participant_id
  where le.slug = lower(trim(p_slug))
    and lat.token_hash = p_token
    and lat.expires_at > now()
    and le.status <> 'cancelled'
  limit 1;

  if v_live_id is null then
    raise exception 'ACCESS_DENIED';
  end if;

  if char_length(trim(p_message)) < 1 or char_length(p_message) > 1000 then
    raise exception 'INVALID_MESSAGE';
  end if;

  select p.id
    into v_participant_id
  from public.live_event_participants p
  where p.live_event_id = v_live_id
    and lower(p.email) = lower(v_email)
  limit 1;

  insert into public.live_event_messages(
    live_event_id,
    organization_id,
    sender_type,
    participant_id,
    sender_email,
    message
  )
  values(
    v_live_id,
    v_org_id,
    'attendee',
    v_participant_id,
    lower(v_email),
    trim(p_message)
  )
  returning live_event_messages.id into v_id;

  return query
    select m.id, m.sender_type, m.sender_email, m.message, m.created_at
    from public.live_event_messages m
    where m.id = v_id;
end;
$$;

grant execute on function public.send_live_chat(text,text,text) to anon, authenticated;
revoke execute on function public.send_live_chat(text,text,text) from public;
