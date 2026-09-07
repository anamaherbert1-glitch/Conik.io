alter table public.funnels add column if not exists capture_enabled boolean not null default false;
alter table public.funnels add column if not exists capture_delay_ms integer not null default 5000;
alter table public.funnels add column if not exists capture_html text not null default '';
alter table public.funnels add column if not exists capture_css text not null default '';
alter table public.funnels add column if not exists capture_js text not null default '';

alter table public.funnels drop constraint if exists funnels_capture_delay_ms_check;
alter table public.funnels add constraint funnels_capture_delay_ms_check
  check (capture_delay_ms between 0 and 30000);
