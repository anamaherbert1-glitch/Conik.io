-- Live attendee presence + WhatsApp invitation preparation
alter table public.live_event_participants add column if not exists last_seen_at timestamptz;
alter table public.live_events add column if not exists whatsapp_message_draft text;
alter table public.live_events add column if not exists whatsapp_campaign_id uuid;
create index if not exists idx_live_event_participants_last_seen on public.live_event_participants(live_event_id,last_seen_at);

create or replace function public.mark_live_attendance(p_slug text,p_token text)
returns table(participant_id uuid,live_event_id uuid,contact_id uuid,display_name text,email text,joined_at timestamptz,last_seen_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_participant public.live_event_participants%rowtype;
begin
 select p.* into v_participant from public.live_access_tokens t join public.live_event_participants p on p.id=t.participant_id join public.live_events e on e.id=p.live_event_id where e.slug=lower(trim(p_slug)) and t.token_hash=encode(digest(p_token,'sha256'),'hex') and t.expires_at>now() and e.status not in ('cancelled','ended') and p.status<>'blocked' order by t.created_at desc limit 1;
 if not found then raise exception 'ACCESS_DENIED'; end if;
 update public.live_event_participants p set status='joined',joined_at=coalesce(p.joined_at,now()),last_seen_at=now() where p.id=v_participant.id;
 return query select p.id,p.live_event_id,p.contact_id,coalesce(nullif(trim(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')),''),p.email),p.email,p.joined_at,p.last_seen_at from public.live_event_participants p join public.contacts c on c.id=p.contact_id where p.id=v_participant.id;
end; $$;
grant execute on function public.mark_live_attendance(text,text) to anon,authenticated;
revoke all on function public.mark_live_attendance(text,text) from public;

create or replace function public.get_live_attendance(p_live_id uuid)
returns table(participant_id uuid,contact_id uuid,display_name text,email text,status text,joined_at timestamptz,last_seen_at timestamptz,connected boolean)
language sql security definer set search_path=public as $$
 select p.id,p.contact_id,coalesce(nullif(trim(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')),''),p.email),p.email,p.status,p.joined_at,p.last_seen_at,(p.last_seen_at is not null and p.last_seen_at > now()-interval '30 seconds') from public.live_event_participants p join public.contacts c on c.id=p.contact_id where p.live_event_id=p_live_id order by (p.last_seen_at is not null and p.last_seen_at > now()-interval '30 seconds') desc,p.joined_at nulls last,p.invited_at;
$$;
revoke all on function public.get_live_attendance(uuid) from public;
grant execute on function public.get_live_attendance(uuid) to authenticated;

create table if not exists public.live_event_whatsapp_invites (id uuid primary key default gen_random_uuid(),live_event_id uuid not null references public.live_events(id) on delete cascade,organization_id uuid not null references public.organizations(id) on delete cascade,message text not null,status text not null default 'draft' check(status in ('draft','ready','sending','completed','failed','cancelled')),campaign_id uuid,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_live_event_whatsapp_invites_live on public.live_event_whatsapp_invites(live_event_id);
alter table public.live_event_whatsapp_invites enable row level security;
revoke all on table public.live_event_whatsapp_invites from anon;
grant select,insert,update,delete on public.live_event_whatsapp_invites to authenticated;
do $$ begin create policy live_event_whatsapp_invites_member on public.live_event_whatsapp_invites for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id)); exception when duplicate_object then null; end $$;
