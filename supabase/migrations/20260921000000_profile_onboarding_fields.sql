-- Store the profile fields collected during first-account onboarding.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists company text;
