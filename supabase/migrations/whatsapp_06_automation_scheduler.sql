-- CONIK automation scheduler: durable delayed actions + per-action execution logs.
create table if not exists public.automation_action_executions (
  id uuid primary key default gen_random_uuid(),
  automation_execution_id uuid not null references public.automation_executions(id) on delete cascade,
  action_id uuid not null references public.automation_actions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','skipped')),
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_action_exec_due on public.automation_action_executions(status, scheduled_for);
create index if not exists idx_automation_action_exec_execution on public.automation_action_executions(automation_execution_id);

alter table public.automation_action_executions enable row level security;
create policy automation_action_exec_member on public.automation_action_executions for all to authenticated
using (exists (
  select 1 from public.automation_executions e
  join public.automations a on a.id=e.automation_id
  where e.id=automation_execution_id and public.is_org_member(a.organization_id)
))
with check (exists (
  select 1 from public.automation_executions e
  join public.automations a on a.id=e.automation_id
  where e.id=automation_execution_id and public.is_org_member(a.organization_id)
));

grant select, insert, update, delete on public.automation_action_executions to authenticated;

create or replace function public.automation_schedule_action(
  p_execution_id uuid,
  p_action_id uuid,
  p_scheduled_for timestamptz default now()
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from automation_executions e join automations a on a.id=e.automation_id
    where e.id=p_execution_id and public.is_org_member(a.organization_id)
  ) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from automation_actions where id=p_action_id and automation_id=(select automation_id from automation_executions where id=p_execution_id)) then raise exception 'Invalid automation action'; end if;
  insert into automation_action_executions(automation_execution_id,action_id,scheduled_for)
  values(p_execution_id,p_action_id,p_scheduled_for) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.automation_schedule_action(uuid,uuid,timestamptz) from public;
grant execute on function public.automation_schedule_action(uuid,uuid,timestamptz) to authenticated;

create or replace function public.automation_claim_due_actions(p_limit integer default 50)
returns setof public.automation_action_executions
language plpgsql security definer set search_path=public as $$
begin
  return query
  update public.automation_action_executions x
  set status='running', started_at=coalesce(started_at,now()), attempts=attempts+1
  where x.id in (
    select id from public.automation_action_executions
    where status='pending' and scheduled_for <= now()
    order by scheduled_for asc limit greatest(1,least(p_limit,200))
    for update skip locked
  )
  returning x.*;
end; $$;
revoke all on function public.automation_claim_due_actions(integer) from public;

create or replace function public.automation_finish_action(
  p_action_execution_id uuid,
  p_status text,
  p_result jsonb default '{}'::jsonb,
  p_error text default null,
  p_retry_seconds integer default 0
) returns void
language plpgsql security definer set search_path=public as $$
declare v_attempts integer;
begin
  select attempts into v_attempts from automation_action_executions where id=p_action_execution_id for update;
  if p_status='failed' and coalesce(p_retry_seconds,0)>0 and coalesce(v_attempts,0)<3 then
    update automation_action_executions set status='pending', scheduled_for=now()+make_interval(secs=>p_retry_seconds), error=left(p_error,1000), result=coalesce(p_result,'{}'::jsonb) where id=p_action_execution_id;
  else
    update automation_action_executions set status=p_status, completed_at=now(), error=left(p_error,1000), result=coalesce(p_result,'{}'::jsonb) where id=p_action_execution_id;
  end if;
end; $$;
revoke all on function public.automation_finish_action(uuid,text,jsonb,text,integer) from public;

-- Prevent the old synchronous SQL path from trying to execute waits.
-- The application scheduler owns delayed actions; existing action storage remains compatible.
