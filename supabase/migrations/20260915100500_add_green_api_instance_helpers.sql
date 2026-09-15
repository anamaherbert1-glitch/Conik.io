create or replace function public.green_api_create_instance_record(
  p_organization_id uuid,
  p_connection_id uuid,
  p_id_instance text,
  p_api_url text,
  p_media_url text,
  p_api_token_cipher text,
  p_instance_name text,
  p_created_by uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  ) then raise exception 'FORBIDDEN'; end if;

  insert into public.whatsapp_green_instances
    (organization_id, connection_id, id_instance, api_url, media_url, api_token_cipher, instance_name, created_by, status, updated_at)
  values
    (p_organization_id, p_connection_id, p_id_instance, p_api_url, nullif(p_media_url,''), p_api_token_cipher, nullif(p_instance_name,''), p_created_by, 'notAuthorized', now())
  on conflict (id_instance) do update set
    organization_id = excluded.organization_id,
    connection_id = excluded.connection_id,
    api_url = excluded.api_url,
    media_url = excluded.media_url,
    api_token_cipher = excluded.api_token_cipher,
    instance_name = excluded.instance_name,
    updated_at = now(),
    last_error = null
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.green_api_create_instance_record(uuid,uuid,text,text,text,text,text,uuid) from public;
grant execute on function public.green_api_create_instance_record(uuid,uuid,text,text,text,text,text,uuid) to authenticated;

create or replace function public.green_api_update_instance_status(
  p_id_instance text,
  p_status text,
  p_wid text default null,
  p_error text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.whatsapp_green_instances gi
    where gi.id_instance = p_id_instance
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = gi.organization_id
          and om.user_id = auth.uid()
      )
  ) then raise exception 'FORBIDDEN'; end if;

  update public.whatsapp_green_instances
  set status = case when p_status in ('notAuthorized','authorized','blocked','starting','yellow','red','unknown') then p_status else 'unknown' end,
      wid = coalesce(nullif(p_wid,''), wid),
      last_error = nullif(p_error,''),
      last_synced_at = now(),
      updated_at = now()
  where id_instance = p_id_instance;
  return found;
end;
$$;

revoke all on function public.green_api_update_instance_status(text,text,text,text) from public;
grant execute on function public.green_api_update_instance_status(text,text,text,text) to authenticated;
