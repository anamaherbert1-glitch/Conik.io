-- Conik.io database health diagnostic (read-only)
-- Run in Supabase SQL Editor. Does not mutate data.

-- 1) Ordinary public tables without RLS (expected result: zero rows).
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- 2) Public policies with unrestricted checks (review carefully; expected result: zero rows).
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual = 'true' or with_check = 'true')
order by tablename, policyname;

-- 3) Security-definer functions executable by anon (review individually; not all are necessarily bugs).
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       coalesce(array_to_string(p.proacl, ','), '(default ACL)') as privileges
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by p.proname;

-- 4) Required module tables (present/missing).
with required(table_name) as (
  values
    ('profiles'), ('organizations'), ('organization_members'),
    ('funnels'), ('funnel_pages'), ('funnel_versions'), ('funnel_assets'),
    ('contacts'), ('campaigns'), ('domains'),
    ('payment_providers'), ('payment_pages'), ('payment_tariffs'),
    ('payment_orders'), ('payment_transactions'),
    ('live_events'), ('live_event_participants'), ('live_event_sessions'),
    ('digital_products'), ('product_access')
)
select r.table_name,
       case when c.oid is null then 'MISSING' else 'present' end as status,
       case when c.oid is not null then c.relrowsecurity else null end as rls_enabled
from required r
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid
                   and c.relname = r.table_name
                   and c.relkind = 'r'
order by r.table_name;

-- 5) Duplicate policies per table/action (may be intentional; review for OR combinations).
select tablename, cmd, roles, count(*) as policy_count,
       string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
group by tablename, cmd, roles
having count(*) > 1
order by tablename, cmd;

-- 6) Storage buckets and visibility.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

-- 7) Migration ledger (names and timestamps).
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 30;
