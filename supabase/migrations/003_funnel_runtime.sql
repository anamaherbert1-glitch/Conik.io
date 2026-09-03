create or replace function public.get_published_funnel_page(target_funnel_slug text, target_page_slug text default 'home')
returns table (
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
  metadata jsonb
)
language sql
security definer
stable
set search_path = public
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
    v.metadata
  from public.funnels f
  join public.funnel_pages p on p.funnel_id = f.id
  join public.funnel_versions v on v.id = p.published_version_id and v.page_id = p.id
  where f.slug = lower(trim(target_funnel_slug))
    and p.slug = lower(trim(target_page_slug))
    and f.status = 'published'
  limit 1;
$$;

revoke all on function public.get_published_funnel_page(text, text) from public;
grant execute on function public.get_published_funnel_page(text, text) to anon, authenticated;
