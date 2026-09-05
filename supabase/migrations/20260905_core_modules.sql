-- Core modules used by campaigns, links, domains, automations
-- Safe to re-run (IF NOT EXISTS)

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  funnel_id uuid references public.funnels(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_org on public.campaigns(organization_id);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  destination_url text not null,
  funnel_id uuid references public.funnels(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists idx_links_org on public.links(organization_id);
create index if not exists idx_links_slug on public.links(slug);

create table if not exists public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_link_clicks_link on public.link_clicks(link_id);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hostname text not null unique,
  status text not null default 'pending_dns' check (status in ('pending_dns','verified','failed','disabled')),
  funnel_id uuid references public.funnels(id) on delete set null,
  verification_token text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists idx_domains_org on public.domains(organization_id);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_automations_org on public.automations(organization_id);

create table if not exists public.automation_actions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  position integer not null default 0,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
  context jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- RLS
alter table public.campaigns enable row level security;
alter table public.links enable row level security;
alter table public.link_clicks enable row level security;
alter table public.domains enable row level security;
alter table public.automations enable row level security;
alter table public.automation_actions enable row level security;
alter table public.automation_executions enable row level security;

do $$ begin
  create policy campaigns_member on public.campaigns for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy links_member on public.links for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy link_clicks_member on public.link_clicks for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy domains_member on public.domains for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy automations_member on public.automations for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy automation_actions_member on public.automation_actions for all to authenticated
    using (exists (select 1 from public.automations a where a.id = automation_id and public.is_org_member(a.organization_id)))
    with check (exists (select 1 from public.automations a where a.id = automation_id and public.is_org_member(a.organization_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy automation_executions_member on public.automation_executions for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;
