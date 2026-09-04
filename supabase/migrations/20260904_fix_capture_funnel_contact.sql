-- Corrige capture_funnel_contact :
--  1. contacts.status doit valoir 'lead' | 'customer' | 'unsubscribed' (et non 'active')
--  2. contacts.consent_status doit valoir 'opted_in' | 'opted_out' | 'unknown' (et non 'granted')
--  3. la variable `contact_id` masquait la colonne `contact_tags.contact_id`
--     (`where contact_id = contact_id` était toujours vrai) -> renommée v_contact_id
create or replace function public.capture_funnel_contact(
  target_funnel_slug text,
  target_page_slug text,
  contact_email text default null,
  contact_phone text default null,
  contact_first_name text default null,
  contact_last_name text default null,
  marketing_consent boolean default false,
  form_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  funnel_org uuid; funnel_id_value uuid; page_id_value uuid; v_contact_id uuid;
  form_id_value uuid; execution_id uuid; auto_rec record; action_rec record; tag_value uuid;
  clean_email text := nullif(lower(trim(contact_email)), '');
  clean_phone text := nullif(trim(contact_phone), '');
  clean_first text := nullif(trim(contact_first_name), '');
  clean_last  text := nullif(trim(contact_last_name), '');
begin
  if clean_email is null and clean_phone is null then raise exception 'Email or phone is required'; end if;
  if clean_email is not null and (length(clean_email) > 320 or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'Invalid email'; end if;
  if clean_phone is not null and length(clean_phone) > 40 then raise exception 'Invalid phone'; end if;
  if jsonb_typeof(coalesce(form_data, '{}'::jsonb)) <> 'object' then raise exception 'Invalid form data'; end if;

  select f.id, f.organization_id into funnel_id_value, funnel_org
  from public.funnels f
  where f.slug = lower(trim(target_funnel_slug)) and f.status = 'published'
  limit 1;
  if funnel_id_value is null then raise exception 'Funnel not found'; end if;

  select p.id into page_id_value
  from public.funnel_pages p
  where p.funnel_id = funnel_id_value and p.slug = lower(trim(target_page_slug)) and p.published_version_id is not null
  limit 1;
  if page_id_value is null then raise exception 'Page not found'; end if;

  if clean_email is not null then
    select c.id into v_contact_id from public.contacts c
    where c.organization_id = funnel_org and lower(c.email) = clean_email
    order by c.created_at asc limit 1;
  end if;
  if v_contact_id is null and clean_phone is not null then
    select c.id into v_contact_id from public.contacts c
    where c.organization_id = funnel_org and c.phone = clean_phone
    order by c.created_at asc limit 1;
  end if;

  if v_contact_id is null then
    insert into public.contacts(organization_id, email, phone, first_name, last_name, status, consent_status, custom_fields, last_activity_at)
    values (funnel_org, clean_email, clean_phone, clean_first, clean_last, 'lead',
            case when marketing_consent then 'opted_in' else 'unknown' end,
            coalesce(form_data, '{}'::jsonb), now())
    returning id into v_contact_id;
  else
    update public.contacts c set
      email = coalesce(clean_email, c.email),
      phone = coalesce(clean_phone, c.phone),
      first_name = coalesce(clean_first, c.first_name),
      last_name = coalesce(clean_last, c.last_name),
      consent_status = case when marketing_consent then 'opted_in' else c.consent_status end,
      custom_fields = coalesce(c.custom_fields, '{}'::jsonb) || coalesce(form_data, '{}'::jsonb),
      last_activity_at = now(),
      updated_at = now()
    where c.id = v_contact_id;
  end if;

  select id into form_id_value from public.forms
  where funnel_id = funnel_id_value and page_id = page_id_value order by created_at asc limit 1;
  if form_id_value is null then
    insert into public.forms(funnel_id, page_id, name, fields)
    values (funnel_id_value, page_id_value, 'Formulaire public', '{}'::jsonb)
    returning id into form_id_value;
  end if;

  insert into public.form_submissions(form_id, contact_id, data)
  values (form_id_value, v_contact_id, coalesce(form_data, '{}'::jsonb));

  insert into public.contact_activity(contact_id, organization_id, type, metadata)
  values (v_contact_id, funnel_org, 'form_submission',
          jsonb_build_object('funnel_id', funnel_id_value, 'page_id', page_id_value));

  for auto_rec in
    select id from public.automations
    where organization_id = funnel_org and status = 'active'
      and trigger_type in ('new_contact', 'form_submission')
  loop
    insert into public.automation_executions(automation_id, contact_id, status, triggered_at)
    values (auto_rec.id, v_contact_id, 'running', now())
    returning id into execution_id;
    begin
      for action_rec in
        select action_type, action_config from public.automation_actions
        where automation_id = auto_rec.id order by position
      loop
        if action_rec.action_type in ('add_tag', 'remove_tag') then
          tag_value := nullif(action_rec.action_config->>'tag_id', '')::uuid;
          if tag_value is null or not exists (select 1 from public.tags t where t.id = tag_value and t.organization_id = funnel_org) then
            raise exception 'Invalid automation tag';
          end if;
          if action_rec.action_type = 'add_tag' then
            if not exists (select 1 from public.contact_tags ct where ct.contact_id = v_contact_id and ct.tag_id = tag_value) then
              insert into public.contact_tags(contact_id, tag_id) values (v_contact_id, tag_value);
            end if;
          else
            delete from public.contact_tags ct where ct.contact_id = v_contact_id and ct.tag_id = tag_value;
          end if;
        elsif action_rec.action_type = 'internal_log' then
          insert into public.contact_activity(contact_id, organization_id, type, metadata)
          values (v_contact_id, funnel_org, 'automation_action', action_rec.action_config);
        elsif action_rec.action_type = 'wait' then
          raise exception 'Wait actions require the scheduler and were not executed';
        end if;
      end loop;
      update public.automation_executions set status = 'completed', completed_at = now() where id = execution_id;
    exception when others then
      update public.automation_executions set status = 'failed', error = left(sqlerrm, 1000), completed_at = now() where id = execution_id;
    end;
  end loop;

  return v_contact_id;
end;
$function$;
