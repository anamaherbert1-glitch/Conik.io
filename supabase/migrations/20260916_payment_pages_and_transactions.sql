-- Conik.io payment integration foundation
-- Designed for imported/custom payment pages, multi-provider checkout,
-- transaction tracking, refunds, and webhook idempotency.
-- IMPORTANT: never store PAN, CVV, PIN, OTP, or provider secret keys here.

create table if not exists public.payment_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null,
  status text not null default 'draft' check (status in ('draft','published','paused','archived')),
  source text not null default 'manual' check (source in ('manual','import','template')),
  source_url text,
  imported_at timestamptz,
  published_at timestamptz,
  currency char(3) not null default 'XOF',
  amount_type text not null default 'fixed' check (amount_type in ('fixed','customer_defined','ticket_based')),
  fixed_amount numeric(14,2) check (fixed_amount is null or fixed_amount >= 0),
  checkout_config jsonb not null default '{}'::jsonb,
  success_url text,
  cancel_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_code text not null,
  display_name text not null,
  status text not null default 'inactive' check (status in ('inactive','active','disabled','error')),
  supported_methods jsonb not null default '[]'::jsonb,
  account_reference text,
  secret_reference text,
  public_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_code)
);

create table if not exists public.payment_page_methods (
  id uuid primary key default gen_random_uuid(),
  payment_page_id uuid not null references public.payment_pages(id) on delete cascade,
  payment_provider_id uuid not null references public.payment_providers(id) on delete cascade,
  method_code text not null,
  display_name text not null,
  enabled boolean not null default true,
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  unique (payment_page_id, method_code)
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_page_id uuid references public.payment_pages(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  order_number text not null,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  currency char(3) not null default 'XOF',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  fees numeric(14,2) not null default 0 check (fees >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled','refunded','partially_refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.payment_orders(id) on delete cascade,
  payment_page_id uuid references public.payment_pages(id) on delete set null,
  payment_provider_id uuid references public.payment_providers(id) on delete set null,
  provider_code text not null,
  method_code text not null,
  provider_transaction_id text,
  provider_payment_reference text,
  idempotency_key text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'XOF',
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','cancelled','refunded','partially_refunded')),
  failure_code text,
  failure_message text,
  customer_phone text,
  card_brand text,
  card_last4 char(4),
  provider_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  provider_refund_id text,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'XOF',
  status text not null default 'pending' check (status in ('pending','succeeded','failed','cancelled')),
  reason text,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  payment_provider_id uuid references public.payment_providers(id) on delete set null,
  provider_code text not null,
  external_event_id text not null,
  event_type text not null,
  transaction_id uuid references public.payment_transactions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending' check (processing_status in ('pending','processed','failed','ignored')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider_code, external_event_id)
);

create index if not exists idx_payment_pages_org on public.payment_pages(organization_id);
create index if not exists idx_payment_pages_status on public.payment_pages(status);
create index if not exists idx_payment_providers_org on public.payment_providers(organization_id);
create index if not exists idx_payment_page_methods_page on public.payment_page_methods(payment_page_id);
create index if not exists idx_payment_orders_org on public.payment_orders(organization_id);
create index if not exists idx_payment_orders_page on public.payment_orders(payment_page_id);
create index if not exists idx_payment_orders_status on public.payment_orders(status);
create index if not exists idx_payment_transactions_org on public.payment_transactions(organization_id);
create index if not exists idx_payment_transactions_order on public.payment_transactions(order_id);
create index if not exists idx_payment_transactions_provider_id on public.payment_transactions(provider_transaction_id);
create index if not exists idx_payment_transactions_status on public.payment_transactions(status);
create index if not exists idx_payment_refunds_transaction on public.payment_refunds(transaction_id);
create index if not exists idx_payment_webhooks_transaction on public.payment_webhook_events(transaction_id);

-- Updated-at triggers
 drop trigger if exists payment_pages_updated_at on public.payment_pages;
create trigger payment_pages_updated_at before update on public.payment_pages for each row execute function public.set_updated_at();
drop trigger if exists payment_providers_updated_at on public.payment_providers;
create trigger payment_providers_updated_at before update on public.payment_providers for each row execute function public.set_updated_at();
drop trigger if exists payment_orders_updated_at on public.payment_orders;
create trigger payment_orders_updated_at before update on public.payment_orders for each row execute function public.set_updated_at();
drop trigger if exists payment_transactions_updated_at on public.payment_transactions;
create trigger payment_transactions_updated_at before update on public.payment_transactions for each row execute function public.set_updated_at();

-- RLS
alter table public.payment_pages enable row level security;
alter table public.payment_providers enable row level security;
alter table public.payment_page_methods enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.payment_webhook_events enable row level security;

drop policy if exists payment_pages_member on public.payment_pages;
create policy payment_pages_member on public.payment_pages for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

-- Published payment pages are intentionally readable for public checkout rendering.
drop policy if exists payment_pages_public_published on public.payment_pages;
create policy payment_pages_public_published on public.payment_pages for select to anon, authenticated
using (status = 'published');

drop policy if exists payment_providers_member on public.payment_providers;
create policy payment_providers_member on public.payment_providers for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists payment_page_methods_member on public.payment_page_methods;
create policy payment_page_methods_member on public.payment_page_methods for all to authenticated
using (exists (select 1 from public.payment_pages p where p.id = payment_page_id and public.is_org_member(p.organization_id)))
with check (exists (select 1 from public.payment_pages p where p.id = payment_page_id and public.is_org_member(p.organization_id)));

drop policy if exists payment_orders_member on public.payment_orders;
create policy payment_orders_member on public.payment_orders for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists payment_transactions_member on public.payment_transactions;
create policy payment_transactions_member on public.payment_transactions for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists payment_refunds_member on public.payment_refunds;
create policy payment_refunds_member on public.payment_refunds for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists payment_webhook_events_member on public.payment_webhook_events;
create policy payment_webhook_events_member on public.payment_webhook_events for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

-- The public checkout should create orders/transactions through server-side routes or Edge Functions,
-- not direct anonymous table writes. No anon INSERT policies are granted here.

grant select on public.payment_pages to anon, authenticated;
grant select, insert, update, delete on public.payment_pages to authenticated;
grant select, insert, update, delete on public.payment_providers to authenticated;
grant select, insert, update, delete on public.payment_page_methods to authenticated;
grant select, insert, update, delete on public.payment_orders to authenticated;
grant select, insert, update, delete on public.payment_transactions to authenticated;
grant select, insert, update, delete on public.payment_refunds to authenticated;
grant select, insert, update, delete on public.payment_webhook_events to authenticated;
