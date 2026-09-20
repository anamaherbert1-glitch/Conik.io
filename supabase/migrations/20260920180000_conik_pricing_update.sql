-- Conik pricing update: Basic 9 EUR/month, 90 EUR/year; Premium 10 EUR/month, 111.12 EUR/year
update public.subscription_billing_catalog
set price = case product_code
  when 'conik_basic' then 9
  when 'conik_basic_annual' then 90
  when 'conik_premium' then 10
  when 'conik_premium_annual' then 111.12
  else price
end,
updated_at = now()
where product_code in ('conik_basic','conik_basic_annual','conik_premium','conik_premium_annual');