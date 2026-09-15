create or replace function public.green_api_connect_instance(
  p_organization_id uuid,
  p_id_instance text,
  p_api_url text,
  p_media_url text,
  p_api_token_cipher text,
  p_instance_name text,
  p_webhook_token_hash text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing public.whatsapp_green_instances%rowtype;
begin
  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_existing
  from public.whatsapp_green_instances
  where id_instance = p_id_instance
  limit 1;

  if found and v_existing.organization_id <> p_organization_id then
    raise exception 'INSTANCE_ALREADY_LINKED';
  end if;

  insert into public.whatsapp_green_instances
    (organization_id, connection_id, id_instance, api_url, media_url,
     api_token_cipher, instance_name, created_by, webhook_token_hash,
     status, metadata, last_error, updated_at)
  values
    (p_organization_id, null, p_id_instance, p_api_url, nullif(p_media_url,''),
     p_api_token_cipher, nullif(p_instance_name,''), p_created_by,
     p_webhook_token_hash, 'unknown',
     jsonb_build_object('mode','manual','provider','green-api','partner',false),
     null, now())
  on conflict (id_instance) do update set
    api_url = excluded.api_url,
    media_url = excluded.media_url,
    api_token_cipher = excluded.api_token_cipher,
    instance_name = excluded.instance_name,
    created_by = excluded.created_by,
    webhook_token_hash = excluded.webhook_token_hash,
    status = excluded.status,
    metadata = excluded.metadata,
    last_error = null,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.green_api_connect_instance(uuid,text,text,text,text,text,text,uuid) from public;
grant execute on function public.green_api_connect_instance(uuid,text,text,text,text,text,text,uuid) to authenticated;
