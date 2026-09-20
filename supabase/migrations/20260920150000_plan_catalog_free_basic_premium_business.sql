-- Catalogue Free / Basic / Premium / Business
create table if not exists public.subscription_billing_catalog (
  product_code text primary key,
  plan_code text not null,
  product_type text not null check (product_type in ('conik','whatsapp')),
  fixed_days integer null,
  daily_price numeric(12,2) null,
  price numeric(12,2) not null default 0,
  currency text not null default 'XOF',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.subscription_billing_catalog (product_code, plan_code, product_type, price, daily_price, currency, active)
values
  ('conik_free', 'free', 'conik', 0, null, 'XOF', true),
  ('conik_basic', 'basic', 'conik', 15000, null, 'XOF', true),
  ('conik_premium', 'premium', 'conik', 45000, null, 'XOF', true),
  ('conik_business', 'business', 'conik', 99000, null, 'XOF', true),
  ('whatsapp_basic', 'basic', 'whatsapp', 0, 500, 'XOF', true),
  ('whatsapp_premium', 'premium', 'whatsapp', 0, 1000, 'XOF', true)
on conflict (product_code) do update set
  plan_code = excluded.plan_code,
  product_type = excluded.product_type,
  price = excluded.price,
  daily_price = excluded.daily_price,
  currency = excluded.currency,
  active = excluded.active,
  updated_at = now();
