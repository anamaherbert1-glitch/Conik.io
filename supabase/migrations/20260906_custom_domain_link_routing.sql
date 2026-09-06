alter table public.links add column if not exists domain_id uuid references public.domains(id) on delete set null;
create index if not exists links_domain_id_idx on public.links(domain_id);

create or replace function public.record_link_click(target_slug text, target_visitor text default null, target_source text default null, target_device text default null, target_host text default null)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare destination text; link_value uuid;
begin
  select l.id,l.destination_url into link_value,destination
  from public.links l
  left join public.domains d on d.id=l.domain_id
  where lower(l.slug)=lower(trim(target_slug))
    and ((target_host is null or trim(target_host)='' or lower(trim(target_host)) in ('conik-io.vercel.app','conik.io','www.conik.io')) and l.domain_id is null
      or (target_host is not null and trim(target_host)<>'' and d.status='verified' and lower(d.hostname)=lower(trim(target_host))))
  order by l.created_at desc limit 1;
  if link_value is null then raise exception 'link not found'; end if;
  insert into public.link_clicks(link_id,visitor_id,source,device)
  values(link_value,left(target_visitor,100),left(target_source,200),left(target_device,100));
  return destination;
end;
$$;

create or replace function public.is_verified_custom_domain(target_host text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists(select 1 from public.domains where status='verified' and lower(hostname)=lower(trim(target_host)));
$$;

grant execute on function public.is_verified_custom_domain(text) to anon, authenticated;
