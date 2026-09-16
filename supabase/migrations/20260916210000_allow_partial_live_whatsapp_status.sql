alter table public.live_event_whatsapp_invites
drop constraint if exists live_event_whatsapp_invites_status_check;

alter table public.live_event_whatsapp_invites
add constraint live_event_whatsapp_invites_status_check
check (status = any (array['draft'::text, 'ready'::text, 'sending'::text, 'completed'::text, 'partial'::text, 'failed'::text, 'cancelled'::text]));
