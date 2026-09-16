-- Prestataires de paiement (Wave, CinetPay, Flutterwave...)
create table if not exists public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('wave','cinetpay','flutterwave','other')),
  label text not null default '',
  credentials jsonb not null default '{}'::jsonb,
  status text not null default 'connected' check (status in ('connected','disabled','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payment_providers_org on public.payment_providers(organization_id);

-- Page de paiement par tunnel (comme capture)
alter table public.funnels add column if not exists payment_enabled boolean not null default false;
alter table public.funnels add column if not exists payment_html text not null default '';
alter table public.funnels add column if not exists payment_css text not null default '';
alter table public.funnels add column if not exists payment_js text not null default '';
alter table public.funnels add column if not exists payment_provider_id uuid references public.payment_providers(id) on delete set null;

-- Tarifs : chaque montant a un lien unique vers la même page de paiement
create table if not exists public.payment_tariffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  name text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'XOF',
  slug text not null,
  product_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (funnel_id, slug)
);
create index if not exists idx_payment_tariffs_funnel on public.payment_tariffs(funnel_id);
create index if not exists idx_payment_tariffs_slug on public.payment_tariffs(slug);

-- Commandes / tentatives de paiement
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  tariff_id uuid references public.payment_tariffs(id) on delete set null,
  provider_id uuid references public.payment_providers(id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'XOF',
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled')),
  buyer_email text,
  buyer_phone text,
  buyer_name text,
  provider_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_payment_orders_org on public.payment_orders(organization_id);

alter table public.payment_providers enable row level security;
alter table public.payment_tariffs enable row level security;
alter table public.payment_orders enable row level security;

do $$ begin
  create policy payment_providers_member on public.payment_providers for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy payment_tariffs_member on public.payment_tariffs for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy payment_orders_member on public.payment_orders for all to authenticated
    using (public.is_org_member(organization_id))
    with check (public.is_org_member(organization_id));
exception when duplicate_object then null; end $$;
