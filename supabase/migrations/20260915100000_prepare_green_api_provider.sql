alter table public.whatsapp_connections
  add column if not exists provider text not null default 'meta';

create index if not exists whatsapp_connections_provider_idx
  on public.whatsapp_connections(provider);

create table if not exists public.whatsapp_green_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid null references public.whatsapp_connections(id) on delete set null,
  id_instance text not null,
  api_url text not null,
  media_url text,
  api_token_cipher text not null,
  webhook_token_hash text,
  wid text,
  status text not null default 'notAuthorized',
  instance_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  constraint whatsapp_green_instances_status_check check (status in ('notAuthorized','authorized','blocked','starting','yellow','red','unknown'))
);

create unique index if not exists whatsapp_green_instances_id_instance_uidx
  on public.whatsapp_green_instances(id_instance);
create index if not exists whatsapp_green_instances_organization_idx
  on public.whatsapp_green_instances(organization_id);
create index if not exists whatsapp_green_instances_connection_idx
  on public.whatsapp_green_instances(connection_id);

alter table public.whatsapp_green_instances enable row level security;

create policy "green instances visible to organization members"
on public.whatsapp_green_instances
for select
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = whatsapp_green_instances.organization_id
      and om.user_id = (select auth.uid())
  )
);

create policy "green instances manageable by organization admins"
on public.whatsapp_green_instances
for all
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = whatsapp_green_instances.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = whatsapp_green_instances.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner','admin')
  )
);

comment on table public.whatsapp_green_instances is 'Server-managed GREEN-API Partner WhatsApp instances. API tokens are encrypted and never exposed to clients.';
comment on column public.whatsapp_green_instances.api_token_cipher is 'Encrypted GREEN-API instance API token; decrypt only in trusted server code.';
