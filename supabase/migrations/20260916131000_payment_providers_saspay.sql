-- Ajouter SasPay aux prestataires acceptés
alter table public.payment_providers drop constraint if exists payment_providers_provider_check;

alter table public.payment_providers
  add constraint payment_providers_provider_check
  check (provider in (
    'wave',
    'cinetpay',
    'flutterwave',
    'paydunya',
    'saspay',
    'ligdicash',
    'hub2',
    'fedapay',
    'campay',
    'other'
  ));
