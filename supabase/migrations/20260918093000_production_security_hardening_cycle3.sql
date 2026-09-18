-- Production security hardening cycle 3
-- Tighten privileged RPC input binding and Green API connection mutations.

begin;

create or replace function public.conik_purchase_or_renew(
  p_organization_id uuid,
  p_user_id uuid,
  p_plan_code text,
  p_amount numeric,
  p_currency text default 'XOF',
  p_order_id uuid default null,
  p_payment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_existing public.conik_subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  if p_user_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if not exists(
    select 1 from public.organization_members
    where organization_id=p_organization_id
      and user_id=auth.uid()
      and role in ('owner','admin')
  ) then raise exception 'FORBIDDEN'; end if;

  if p_plan_code not in ('basic','premium') or p_amount < 0 then
    raise exception 'INVALID_SUBSCRIPTION';
  end if;

  if p_payment_id is null or p_order_id is null then
    raise exception 'PAYMENT_NOT_CONFIRMED';
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id
  for update;

  if not found or v_order.status <> 'paid' then
    raise exception 'PAYMENT_NOT_CONFIRMED';
  end if;

  select * into v_payment
  from public.payments
  where id=p_payment_id
    and order_id=p_order_id
    and status='paid'
  for update;

  if not found
     or v_payment.amount <> v_order.amount
     or upper(coalesce(v_payment.currency,'')) <> upper(coalesce(v_order.currency,''))
     or lower(coalesce(v_order.plan_code,'')) <> lower(p_plan_code)
     or v_order.amount <> p_amount
     or upper(coalesce(v_order.currency,'XOF')) <> upper(coalesce(p_currency,'XOF'))
  then
    raise exception 'PAYMENT_NOT_CONFIRMED';
  end if;

  select * into v_existing
  from public.conik_subscriptions
  where organization_id=p_organization_id
    and status='active'
    and ends_at>now()
  order by ends_at desc
  limit 1
  for update;

  if found then
    v_start:=v_existing.starts_at;
    v_end:=v_existing.ends_at+interval '30 days';
    update public.conik_subscriptions
      set ends_at=v_end,
          amount=amount+p_amount,
          plan_code=p_plan_code,
          payment_id=p_payment_id,
          order_id=p_order_id,
          updated_at=now()
    where id=v_existing.id
    returning id into v_id;
  else
    v_start:=now();
    v_end:=v_start+interval '30 days';
    insert into public.conik_subscriptions(
      organization_id,user_id,plan_code,duration_days,amount,currency,
      starts_at,ends_at,status,payment_id,order_id
    )
    values(
      p_organization_id,p_user_id,p_plan_code,30,p_amount,p_currency,
      v_start,v_end,'active',p_payment_id,p_order_id
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$function$;

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
language plpgsql
security definer
set search_path = public
as $function$
declare v_id uuid;
begin
  if p_created_by <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  ) then raise exception 'FORBIDDEN'; end if;

  insert into public.whatsapp_green_instances
    (organization_id, connection_id, id_instance, api_url, media_url,
     api_token_cipher, instance_name, created_by, status, updated_at)
  values
    (p_organization_id, p_connection_id, p_id_instance, p_api_url,
     nullif(p_media_url,''), p_api_token_cipher, nullif(p_instance_name,''),
     p_created_by, 'notAuthorized', now())
  on conflict (id_instance) do update set
    organization_id = excluded.organization_id,
    connection_id = excluded.connection_id,
    api_url = excluded.api_url,
    media_url = excluded.media_url,
    api_token_cipher = excluded.api_token_cipher,
    instance_name = excluded.instance_name,
    created_by = excluded.created_by,
    updated_at = now(),
    last_error = null
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.green_api_update_instance_status(
  p_id_instance text,
  p_status text,
  p_wid text default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not exists (
    select 1
    from public.whatsapp_green_instances gi
    where gi.id_instance = p_id_instance
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = gi.organization_id
          and om.user_id = auth.uid()
          and om.role in ('owner','admin')
      )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.whatsapp_green_instances
  set status = case
      when p_status in ('notAuthorized','authorized','blocked','starting','yellow','red','unknown')
      then p_status else 'unknown' end,
      wid = coalesce(nullif(p_wid,''), wid),
      last_error = nullif(p_error,''),
      last_synced_at = now(),
      updated_at = now()
  where id_instance = p_id_instance;

  return found;
end;
$function$;

revoke execute on function public.green_api_update_instance_status(text,text,text,text) from public, anon;
revoke execute on function public.green_api_create_instance_record(uuid,uuid,text,text,text,text,text,uuid) from public, anon;

commit;
