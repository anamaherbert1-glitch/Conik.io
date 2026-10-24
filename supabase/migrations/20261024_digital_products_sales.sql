-- Conik.io — Espace de vente (produits numériques)
-- Types: formation, ebook, video, bundle, other
-- Livraison après paiement via product_access + shareable link /p/{slug}

create table if not exists public.digital_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null,
  description text,
  product_type text not null check (product_type in ('formation', 'ebook', 'video', 'bundle', 'other')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  currency char(3) not null default 'XOF',
  price_cents integer not null default 0 check (price_cents >= 0),
  -- Type-specific attributes (rubriques dynamiques)
  attributes jsonb not null default '{}'::jsonb,
  -- Delivery: file URL, video URL, course modules, etc.
  delivery jsonb not null default '{}'::jsonb,
  cover_url text,
  funnel_id uuid references public.funnels(id) on delete set null,
  payment_provider_id uuid references public.payment_providers(id) on delete set null,
  payment_page_id uuid references public.payment_pages(id) on delete set null,
  tariff_id uuid,
  -- Enabled payment method codes (subset of provider methods)
  enabled_methods jsonb not null default '[]'::jsonb,
  success_message text,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

-- Optional FK to payment_tariffs if table exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'payment_tariffs'
  ) then
    alter table public.digital_products
      drop constraint if exists digital_products_tariff_id_fkey;
    alter table public.digital_products
      add constraint digital_products_tariff_id_fkey
      foreign key (tariff_id) references public.payment_tariffs(id) on delete set null;
  end if;
end $$;

create table if not exists public.product_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.digital_products(id) on delete cascade,
  order_id uuid references public.payment_orders(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  buyer_email text not null,
  buyer_first_name text,
  buyer_last_name text,
  buyer_phone text,
  access_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked', 'expired')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_digital_products_org on public.digital_products(organization_id);
create index if not exists idx_digital_products_status on public.digital_products(status);
create index if not exists idx_digital_products_slug on public.digital_products(slug);
create index if not exists idx_product_access_product on public.product_access(product_id);
create index if not exists idx_product_access_email on public.product_access(buyer_email);
create index if not exists idx_product_access_token on public.product_access(access_token);

drop trigger if exists digital_products_updated_at on public.digital_products;
create trigger digital_products_updated_at
  before update on public.digital_products
  for each row execute function public.set_updated_at();

alter table public.digital_products enable row level security;
alter table public.product_access enable row level security;

drop policy if exists digital_products_member on public.digital_products;
create policy digital_products_member on public.digital_products
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists digital_products_public_published on public.digital_products;
create policy digital_products_public_published on public.digital_products
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists product_access_member on public.product_access;
create policy product_access_member on public.product_access
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

grant select on public.digital_products to anon, authenticated;
grant select, insert, update, delete on public.digital_products to authenticated;
grant select, insert, update, delete on public.product_access to authenticated;
