-- Conik MCP API keys (for AI assistants via Model Context Protocol)
create table if not exists public.mcp_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['read','write']::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mcp_api_keys_org on public.mcp_api_keys(organization_id);
create index if not exists idx_mcp_api_keys_hash on public.mcp_api_keys(key_hash) where revoked_at is null;

alter table public.mcp_api_keys enable row level security;

drop policy if exists mcp_api_keys_member on public.mcp_api_keys;
create policy mcp_api_keys_member on public.mcp_api_keys
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

grant select, insert, update, delete on public.mcp_api_keys to authenticated;

select 'Conik MCP keys migration OK' as status;
