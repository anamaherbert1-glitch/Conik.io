-- CONIK_FULL_MIGRATION.sql
-- Idempotent reconciliation for the EXISTING Conik.io Supabase project.
-- The existing base schema (funnels, CRM, payments, Live, WhatsApp, subscriptions, auth profile/org tables)
-- is already installed in the target project; this script preserves it and adds the confirmed missing module.
-- NOT a blank-database bootstrap: do not use this file to initialize an empty Supabase project.
-- No business tables are dropped, no auth.users rows are modified, and product access bearer tokens
-- are not exposed to anon/authenticated roles.
-- This file is the current-state consolidated repair script. Historical migrations remain in supabase/migrations.

-- Conik.io safe reconciliation migration
-- Generated 2026-10-25 after comparing the active Supabase schema with repository migrations.
-- Idempotent: creates only the missing digital-products module and tightens two public insert policies.
-- Does not drop business tables, touch auth.users, or expose product-access bearer tokens to client roles.

create extension if not exists pgcrypto;

create table if not exists public.digital_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null,
  description text,
  product_type text not null default 'other' check (product_type in ('formation','ebook','video','bundle','other')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  currency char(3) not null default 'XOF',
  price_cents integer not null default 0 check (price_cents >= 0),
  attributes jsonb not null default '{}'::jsonb,
  delivery jsonb not null default '{}'::jsonb,
  cover_url text,
  funnel_id uuid references public.funnels(id) on delete set null,
  payment_provider_id uuid references public.payment_providers(id) on delete set null,
  payment_page_id uuid references public.payment_pages(id) on delete set null,
  tariff_id uuid,
  enabled_methods jsonb not null default '[]'::jsonb,
  success_message text,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_products_org_slug_unique unique (organization_id, slug)
);

do $$
begin
  if to_regclass('public.payment_tariffs') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = 'public.digital_products'::regclass
         and conname = 'digital_products_tariff_id_fkey'
     ) then
    alter table public.digital_products
      add constraint digital_products_tariff_id_fkey
      foreign key (tariff_id) references public.payment_tariffs(id) on delete set null;
  end if;
end $$;

create index if not exists digital_products_org_status_idx on public.digital_products(organization_id, status);
create index if not exists digital_products_funnel_id_idx on public.digital_products(funnel_id);
create index if not exists digital_products_payment_page_id_idx on public.digital_products(payment_page_id);

drop trigger if exists digital_products_updated_at on public.digital_products;
create trigger digital_products_updated_at before update on public.digital_products
for each row execute function public.set_updated_at();

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
  status text not null default 'pending' check (status in ('pending','active','revoked','expired')),
  granted_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_access_org_status_idx on public.product_access(organization_id, status);
create index if not exists product_access_product_id_idx on public.product_access(product_id);
create index if not exists product_access_order_id_idx on public.product_access(order_id);
create index if not exists product_access_buyer_email_idx on public.product_access(lower(buyer_email));

alter table public.digital_products enable row level security;
alter table public.product_access enable row level security;

drop policy if exists digital_products_public_published on public.digital_products;
create policy digital_products_public_published on public.digital_products
for select to anon, authenticated using (status = 'published');

drop policy if exists digital_products_member_read on public.digital_products;
create policy digital_products_member_read on public.digital_products
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists digital_products_editor_insert on public.digital_products;
create policy digital_products_editor_insert on public.digital_products
for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','editor']::text[]));

drop policy if exists digital_products_editor_update on public.digital_products;
create policy digital_products_editor_update on public.digital_products
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','editor']::text[]))
with check (public.has_org_role(organization_id, array['owner','admin','editor']::text[]));

drop policy if exists digital_products_admin_delete on public.digital_products;
create policy digital_products_admin_delete on public.digital_products
for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::text[]));

-- access_token is a bearer secret. Only trusted server-side service_role code may access this table.
drop policy if exists product_access_member on public.product_access;
drop policy if exists product_access_member_read on public.product_access;
revoke all on table public.product_access from anon, authenticated;
grant all on table public.product_access to service_role;

grant select on table public.digital_products to anon, authenticated;
grant insert, update, delete on table public.digital_products to authenticated;

-- Remove permissive "true" policies which bypassed the intended input validation.
drop policy if exists "public can insert site events" on public.site_events;
drop policy if exists "Public can record website events" on public.site_events;
drop policy if exists "public can record website events" on public.site_events;
create policy "public can record website events" on public.site_events
for insert to anon, authenticated
with check (
  event_type = any (array['page_view','download','support_click','demo_click']::text[])
  and char_length(coalesce(platform, '')) <= 40
);

drop policy if exists "public can insert site leads" on public.site_leads;
drop policy if exists "public can submit site leads" on public.site_leads;
drop policy if exists "Public can submit website leads" on public.site_leads;
drop policy if exists "public can submit website leads" on public.site_leads;
create policy "public can submit website leads" on public.site_leads
for insert to anon, authenticated
with check (
  source = 'website'
  and char_length(coalesce(email, '')) <= 320
  and char_length(coalesce(name, '')) <= 120
  and char_length(coalesce(phone, '')) <= 40
  and char_length(coalesce(institution, '')) <= 200
  and char_length(coalesce(message, '')) <= 3000
);

