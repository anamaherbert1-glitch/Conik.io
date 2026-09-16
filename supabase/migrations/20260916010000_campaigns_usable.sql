-- Enrichir les campagnes pour qu’elles deviennent un vrai plan d’action
alter table public.campaigns add column if not exists description text;
alter table public.campaigns add column if not exists channel text not null default 'whatsapp';
alter table public.campaigns add column if not exists message text;
alter table public.campaigns add column if not exists audience text not null default 'all_contacts';
alter table public.campaigns add column if not exists goal text;
alter table public.campaigns add column if not exists settings jsonb not null default '{}'::jsonb;

do $$
begin
  alter table public.campaigns drop constraint if exists campaigns_channel_check;
  alter table public.campaigns add constraint campaigns_channel_check
    check (channel in ('whatsapp','email','internal'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.campaigns drop constraint if exists campaigns_audience_check;
  alter table public.campaigns add constraint campaigns_audience_check
    check (audience in ('all_contacts','with_phone','with_email','funnel_leads'));
exception when duplicate_object then null;
end $$;
