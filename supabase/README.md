# Supabase — Conik.io

**Project:** `ndsksabyzxfmhnyykcfb`  
**Dashboard:** https://supabase.com/dashboard/project/ndsksabyzxfmhnyykcfb

## Apply migrations (recommended)

### Option A — SQL Editor (fastest)

1. Open [SQL Editor](https://supabase.com/dashboard/project/ndsksabyzxfmhnyykcfb/sql/new)
2. Paste the full content of `ALL_MIGRATIONS.sql`
3. Click **Run**
4. You should see: `CONIK migrations OK — core tables present.`

### Option B — Supabase CLI

```bash
# once
npx supabase login
npx supabase link --project-ref ndsksabyzxfmhnyykcfb

# push migration files in order
npx supabase db push
```

Or run the combined file:

```bash
npx supabase db execute -f supabase/ALL_MIGRATIONS.sql
```

## Migration order

1. `001_foundation.sql` — orgs, members, funnels, contacts, `is_org_member`
2. `002_funnel_engine.sql` — pages, versions, forms, assets
3. `003_funnel_engine_runtime.sql` / `003_funnel_runtime.sql`
4. `004_workspace_security.sql` — roles helpers
5. `004_crm_forms_capture.sql` / `004_zip_import_assets.sql`
6. `20260904_fix_capture_funnel_contact.sql`
7. `20260905_core_modules.sql` — campaigns, links, domains, automations
8. `whatsapp_06_automation_scheduler.sql`
9. `20260905_security_hardening.sql`

## Required env (Vercel / local)

```
NEXT_PUBLIC_SUPABASE_URL=https://ndsksabyzxfmhnyykcfb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
