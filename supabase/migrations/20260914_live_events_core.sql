-- Live Events core: CRM allowlist + attendance foundation
-- Safe to re-run with IF NOT EXISTS / duplicate-policy guards.

create extension if not exists pgcrypto;

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  slug text not null,
  cover_image text,
  scheduled_at timestamptz not null,
  ended_at timestamptz,
  timezone text not null default 'UTC',
  status text not null default 'draft' check (status in ('draft','scheduled','live','ended','cancelled')),
  access_type text not null default 'crm_allowlist' check (access_type in ('crm_allowlist')),
  stream_provider text,
  stream_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists idx_live_events_org on public.live_events(organization_id);
create index if not exists idx_live_events_scheduled_at on public.live_events(scheduled_at);

create table if not exists public.live_event_participants (
  id uuid primary key default gen_random_uuid(),
  live_event_id uuid not null references public.live_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  email text not null,
  status text not null default 'invited' check (status in ('invited','registered','joined','attended','blocked')),
  invited_at timestamptz not null default now(),
  registered_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (live_event_id, contact_id)
);

create index if not exists idx_live_event_participants_event on public.live_event_participants(live_event_id);
create index if not exists idx_live_event_participants_contact on public.live_event_participants(contact_id);
create index if not exists idx_live_event_participants_email on public.live_event_participants(live_event_id, lower(email));

create table if not exists public.live_event_sessions (
  id uuid primary key default gen_random_uuid(),
  live_event_id uuid not null references public.live_events(id) on delete cascade,
  participant_id uuid not null references public.live_event_participants(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  duration_seconds integer,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_event_sessions_event on public.live_event_sessions(live_event_id);
create index if not exists idx_live_event_sessions_participant on public.live_event_sessions(participant_id);

alter table public.live_events enable row level security;
alter table public.live_event_participants enable row level security;
alter table public.live_event_sessions enable row level security;

revoke all on table public.live_events, public.live_event_participants, public.live_event_sessions from anon;
grant select, insert, update, delete on table public.live_events to authenticated;
grant select, insert, update, delete on table public.live_event_participants to authenticated;
grant select, insert, update, delete on table public.live_event_sessions to authenticated;

do $$ begin
  create policy live_events_member on public.live_events for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy live_event_participants_member on public.live_event_participants for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy live_event_sessions_member on public.live_event_sessions for all to authenticated
    using (exists (
      select 1 from public.live_event_participants p
      where p.id = participant_id and public.is_org_member(p.organization_id)
    ))
    with check (exists (
      select 1 from public.live_event_participants p
      where p.id = participant_id and public.is_org_member(p.organization_id)
    ));
exception when duplicate_object then null; end $$;
