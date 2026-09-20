-- Conik subscription pricing: EUR, monthly by default, annual option.
alter table public.subscription_billing_catalog drop constraint if exists subscription_billing_catalog_plan_code_check;
alter table public.subscription_billing_catalog add constraint subscription_billing_catalog_plan_code_check
  check (plan_code in ('basic','premium','business'));

alter table public.subscription_billing_catalog add column if not exists billing_interval text not null default 'monthly';
alter table public.subscription_billing_catalog drop constraint if exists subscription_billing_catalog_interval_check;
alter table public.subscription_billing_catalog add constraint subscription_billing_catalog_interval_check
  check (billing_interval in ('monthly','annual'));

update public.subscription_billing_catalog set billing_interval='monthly';

update public.subscription_billing_catalog
set currency='EUR',
    price=case product_code
      when 'conik_basic' then 5
      when 'conik_premium' then 12
      when 'conik_business' then 29
      else price
    end
where product_type='conik' and billing_interval='monthly';

insert into public.subscription_billing_catalog
  (product_code,plan_code,product_type,price,daily_price,currency,active,billing_interval)
values
  ('conik_basic_annual','basic','conik',50,null,'EUR',true,'annual'),
  ('conik_premium_annual','premium','conik',120,null,'EUR',true,'annual'),
  ('conik_business','business','conik',29,null,'EUR',true,'monthly'),
  ('conik_business_annual','business','conik',290,null,'EUR',true,'annual')
on conflict (product_code) do update set
  plan_code=excluded.plan_code,
  product_type=excluded.product_type,
  price=excluded.price,
  daily_price=excluded.daily_price,
  currency=excluded.currency,
  active=excluded.active,
  billing_interval=excluded.billing_interval,
  updated_at=now();
