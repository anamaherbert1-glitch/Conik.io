create extension if not exists pgcrypto;

create index if not exists idx_contacts_org_created on public.contacts(organization_id, created_at desc);

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
set search_path = public
as $$
declare
  funnel_org uuid;
  funnel_id_value uuid;
  page_id_value uuid;
  contact_id uuid;
  clean_email text := nullif(lower(trim(contact_email)), '');
  clean_phone text := nullif(trim(contact_phone), '');
  clean_first text := nullif(trim(contact_first_name), '');
  clean_last text := nullif(trim(contact_last_name), '');
  source_value text;
begin
  if clean_email is null and clean_phone is null then
    raise exception 'Email or phone is required';
  end if;
  if clean_email is not null and (length(clean_email) > 320 or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'Invalid email';
  end if;
  if clean_phone is not null and length(clean_phone) > 40 then
    raise exception 'Invalid phone';
  end if;
  if length(coalesce(clean_first, '')) > 120 or length(coalesce(clean_last, '')) > 120 then
    raise exception 'Name is too long';
  end if;
  if jsonb_typeof(coalesce(form_data, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid form data';
  end if;

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

  source_value := 'funnel:' || lower(trim(target_funnel_slug)) || '/page:' || lower(trim(target_page_slug));

  if clean_email is not null then
    select id into contact_id from public.contacts
    where organization_id = funnel_org and lower(email) = clean_email
    order by created_at asc limit 1;
  end if;
  if contact_id is null and clean_phone is not null then
    select id into contact_id from public.contacts
    where organization_id = funnel_org and phone = clean_phone
    order by created_at asc limit 1;
  end if;

  if contact_id is null then
    insert into public.contacts(organization_id, email, phone, first_name, last_name, source, consent_marketing)
    values (funnel_org, clean_email, clean_phone, clean_first, clean_last, source_value, coalesce(marketing_consent, false))
    returning id into contact_id;
  else
    update public.contacts set
      email = coalesce(clean_email, email),
      phone = coalesce(clean_phone, phone),
      first_name = coalesce(clean_first, first_name),
      last_name = coalesce(clean_last, last_name),
      source = coalesce(source, source_value),
      consent_marketing = consent_marketing or coalesce(marketing_consent, false),
      updated_at = now()
    where id = contact_id;
  end if;

  return contact_id;
end;
$$;

revoke all on function public.capture_funnel_contact(text,text,text,text,text,text,boolean,jsonb) from public, authenticated;
grant execute on function public.capture_funnel_contact(text,text,text,text,text,text,boolean,jsonb) to anon;
