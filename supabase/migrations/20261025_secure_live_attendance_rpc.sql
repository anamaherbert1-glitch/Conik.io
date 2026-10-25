-- Do not expose participant emails through an anonymous SECURITY DEFINER RPC.
-- Keep the result contract unchanged for the authenticated organization dashboard.
create or replace function public.get_live_attendance(p_live_id uuid)
returns table(
  participant_id uuid,
  contact_id uuid,
  display_name text,
  email text,
  status text,
  joined_at timestamptz,
  last_seen_at timestamptz,
  connected boolean
)
language sql
security definer
set search_path = public
as $function$
  select p.id,
         p.contact_id,
         coalesce(nullif(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')),''), p.email),
         p.email,
         p.status,
         p.joined_at,
         p.last_seen_at,
         (p.last_seen_at is not null and p.last_seen_at > now() - interval '30 seconds')
  from public.live_event_participants p
  join public.contacts c on c.id = p.contact_id
  join public.live_events e on e.id = p.live_event_id
  where p.live_event_id = p_live_id
    and public.is_org_member(e.organization_id)
  order by (p.last_seen_at is not null and p.last_seen_at > now() - interval '30 seconds') desc,
           p.joined_at nulls last,
           p.invited_at;
$function$;

revoke all on function public.get_live_attendance(uuid) from public, anon;
grant execute on function public.get_live_attendance(uuid) to authenticated, service_role;

-- Both functions enforce authenticated identity or auth.uid() internally.
revoke all on function public.end_live_event(uuid) from public, anon;
grant execute on function public.end_live_event(uuid) to authenticated, service_role;

revoke all on function public.conic_check_feature_access(uuid, text) from public, anon;
grant execute on function public.conic_check_feature_access(uuid, text) to authenticated, service_role;
