create or replace function public.capture_funnel_contact(target_funnel_slug text, target_page_slug text, contact_email text default null, contact_phone text default null, contact_first_name text default null, contact_last_name text default null, marketing_consent boolean default false, form_data jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  funnel_org uuid; funnel_id_value uuid; page_id_value uuid; v_contact_id uuid; form_id_value uuid;
  clean_email text := nullif(lower(trim(contact_email), ''));
  clean_phone text := nullif(trim(contact_phone), '');
  clean_first text := nullif(trim(contact_first_name), '');
  clean_last text := nullif(trim(contact_last_name), '');
  v_headers jsonb; v_ip text; v_key text; v_count integer;
begin
  if clean_email is null and clean_phone is null then raise exception 'Email or phone is required'; end if;
  if clean_email is not null and (length(clean_email) > 320 or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'Invalid email'; end if;
  if clean_phone is not null and length(clean_phone) > 40 then raise exception 'Invalid phone'; end if;
  if jsonb_typeof(coalesce(form_data, '{}'::jsonb)) <> 'object' then raise exception 'Invalid form data'; end if;
  if (select count(*) from jsonb_object_keys(coalesce(form_data, '{}'::jsonb))) > 100 then raise exception 'Too many form fields'; end if;

  begin v_headers := nullif(current_setting('request.headers', true),'')::jsonb; exception when others then v_headers := '{}'::jsonb; end;
  v_ip := coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', 'unknown');
  v_ip := left(split_part(v_ip, ',', 1), 200);
  v_key := encode(extensions.digest(lower(v_ip)||':'||lower(trim(target_funnel_slug)), 'sha256'),'hex');
  insert into public.public_submission_rate_limits(key_hash,window_started_at,submission_count,updated_at)
  values(v_key,now(),1,now())
  on conflict (key_hash) do update set
    submission_count = case when public.public_submission_rate_limits.window_started_at < now()-interval '1 minute' then 1 else public.public_submission_rate_limits.submission_count+1 end,
    window_started_at = case when public.public_submission_rate_limits.window_started_at < now()-interval '1 minute' then now() else public.public_submission_rate_limits.window_started_at end,
    updated_at = now()
  returning submission_count into v_count;
  if v_count > 10 then raise exception 'Too many submissions. Please try again later.'; end if;

  select f.id,f.organization_id into funnel_id_value,funnel_org from public.funnels f where f.slug=lower(trim(target_funnel_slug)) and f.status='published' limit 1;
  if funnel_id_value is null then raise exception 'Funnel not found'; end if;
  select p.id into page_id_value from public.funnel_pages p where p.funnel_id=funnel_id_value and p.slug=lower(trim(target_page_slug)) and p.published_version_id is not null limit 1;
  if page_id_value is null then raise exception 'Page not found'; end if;

  if clean_email is not null then select c.id into v_contact_id from public.contacts c where c.organization_id=funnel_org and lower(c.email)=clean_email order by c.created_at asc limit 1; end if;
  if v_contact_id is null and clean_phone is not null then select c.id into v_contact_id from public.contacts c where c.organization_id=funnel_org and c.phone=clean_phone order by c.created_at asc limit 1; end if;
  if v_contact_id is null then
    insert into public.contacts(organization_id,email,phone,first_name,last_name,status,consent_status,custom_fields,last_activity_at)
    values(funnel_org,clean_email,clean_phone,clean_first,clean_last,'lead',case when marketing_consent=true then 'opted_in' else 'unknown' end,coalesce(form_data,'{}'::jsonb),now()) returning id into v_contact_id;
  else
    update public.contacts c set email=coalesce(clean_email,c.email),phone=coalesce(clean_phone,c.phone),first_name=coalesce(clean_first,c.first_name),last_name=coalesce(clean_last,c.last_name),consent_status=case when marketing_consent=true then 'opted_in' else c.consent_status end,custom_fields=coalesce(c.custom_fields,'{}'::jsonb)||coalesce(form_data,'{}'::jsonb),last_activity_at=now(),updated_at=now() where c.id=v_contact_id;
  end if;
  select id into form_id_value from public.forms where funnel_id=funnel_id_value and page_id=page_id_value order by created_at asc limit 1;
  if form_id_value is null then insert into public.forms(funnel_id,page_id,name,fields) values(funnel_id_value,page_id_value,'Formulaire public','{}'::jsonb) returning id into form_id_value; end if;
  insert into public.form_submissions(form_id,contact_id,data) values(form_id_value,v_contact_id,coalesce(form_data,'{}'::jsonb));
  insert into public.contact_activity(contact_id,organization_id,type,metadata) values(v_contact_id,funnel_org,'form_submission',jsonb_build_object('funnel_id',funnel_id_value,'page_id',page_id_value));
  return v_contact_id;
end;
$function$;

revoke all on function public.capture_funnel_contact(text,text,text,text,text,text,boolean,jsonb) from public;
grant execute on function public.capture_funnel_contact(text,text,text,text,text,text,boolean,jsonb) to anon, authenticated;
