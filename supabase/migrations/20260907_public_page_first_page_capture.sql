drop function if exists public.get_published_funnel_page_with_capture(text,text);

create function public.get_published_funnel_page_with_capture(
  target_funnel_slug text,
  target_page_slug text default 'home'
)
returns table(
  funnel_id uuid,
  funnel_name text,
  funnel_slug text,
  page_id uuid,
  page_name text,
  page_slug text,
  page_type text,
  version_id uuid,
  html text,
  css text,
  js text,
  metadata jsonb,
  capture_enabled boolean,
  capture_delay_ms integer,
  capture_html text,
  capture_css text,
  capture_js text,
  is_first_page boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    f.id,
    f.name,
    f.slug,
    p.id,
    p.name,
    p.slug,
    p.page_type,
    v.id,
    v.html,
    v.css,
    v.js,
    v.metadata,
    f.capture_enabled,
    f.capture_delay_ms,
    f.capture_html,
    f.capture_css,
    f.capture_js,
    (p.position = (select min(fp.position) from public.funnel_pages fp where fp.funnel_id = f.id)) as is_first_page
  from public.funnels f
  join public.funnel_pages p on p.funnel_id = f.id
  join public.funnel_versions v on v.id = p.published_version_id
  where f.slug = lower(trim(target_funnel_slug))
    and p.slug = lower(trim(coalesce(target_page_slug, 'home')))
    and f.status = 'published'
    and p.published_version_id is not null;
$$;
