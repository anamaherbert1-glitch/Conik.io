-- CONIK.IO security hardening
-- 1) Keep privileged automation functions callable only by the internal service role.
-- 2) Prevent the WhatsApp provisioning secret helper from being exposed through the Data API.
-- 3) Pin search_path for the privileged functions that remain SECURITY DEFINER.
--
-- This migration is intentionally additive: it does not drop application data or
-- rewrite existing tenant data.

DO $$
DECLARE
  fn record;
BEGIN
  -- These functions perform privileged work and must never be callable by
  -- anonymous or normal authenticated clients.
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'whatsapp_provision_secret',
        'automation_claim_due_actions',
        'automation_finish_action'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', fn.nspname, fn.proname, fn.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon, authenticated', fn.nspname, fn.proname, fn.args);
  END LOOP;

  -- The scheduler functions are invoked by the trusted server/cron path only.
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('automation_claim_due_actions','automation_finish_action')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- The provisioning helper is deliberately NOT granted to authenticated users.
-- WhatsApp secret provisioning must happen through a trusted server-side path.

-- Make privileged functions deterministic with respect to object lookup.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'whatsapp_provision_secret',
        'automation_claim_due_actions',
        'automation_finish_action'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;
