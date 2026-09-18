-- Production security hardening cycle 2
-- Keep public funnel read/capture/tracking RPCs callable anonymously.
-- Lock legacy payment/license mutation RPCs behind server-side execution.
-- Explicit deny policies preserve the current default-deny behavior while
-- making the access model visible to Security Advisor.

begin;

-- These legacy payment mutation functions can create/confirm money and licenses.
-- They are not part of the public funnel runtime and must not be callable by
-- anon/authenticated clients.
revoke execute on function public.create_conik_order(uuid,uuid,text,text,numeric,text,text) from public, anon, authenticated;
revoke execute on function public.create_conik_payment(uuid,text,text,text,numeric,text,jsonb) from public, anon, authenticated;
revoke execute on function public.confirm_conik_payment(uuid) from public, anon, authenticated;

-- Green API connection setup already verifies an authenticated org owner/admin,
-- so anonymous execution is unnecessary.
revoke execute on function public.green_api_connect_instance(uuid,text,text,text,text,text,text,uuid) from public, anon;

-- License activation is intentionally public for the desktop client; keep it.
-- License generation is an internal helper only.
revoke execute on function public.generate_conik_license_key() from public, anon, authenticated;
alter function public.generate_conik_license_key() set search_path = public, extensions;

-- The following tables are server-side / privileged storage. They already had
-- RLS enabled without policies (therefore default-deny). Explicit deny policies
-- document that anon/authenticated must never access them directly.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers',
    'desktop_updates',
    'institutions',
    'license_activations',
    'license_audit',
    'licenses',
    'orders',
    'payments',
    'platform_secrets',
    'public_submission_rate_limits',
    'subscriptions',
    'whatsapp_credentials'
  ] loop
    execute format('drop policy if exists production_deny_client_access on public.%I', t);
    execute format(
      'create policy production_deny_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      t
    );
  end loop;
end $$;

commit;
