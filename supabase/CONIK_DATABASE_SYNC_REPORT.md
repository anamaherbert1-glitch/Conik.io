# Conik.io — Supabase synchronization report

Date: 2026-10-25  
Target project: `ndsksabyzxfmhnyykcfb`  
Repository: `anamaherbert1-glitch/Conik.io`

## Applied to the active database

- Added `digital_products` and `product_access` with idempotent DDL.
- Enabled RLS on both tables.
- Published product rows can be read publicly; organization members can read organization products; owner/admin/editor can create and update; owner/admin can delete.
- `product_access` is deliberately unavailable to `anon` and `authenticated` table access because it stores bearer access tokens. Trusted server-side `service_role` code must mediate access grants and token validation.
- Removed permissive `true` insert policies from `site_events` and `site_leads`, keeping validated input constraints.
- Restricted `get_live_attendance(uuid)` to authenticated organization members and removed anonymous EXECUTE permission.
- Removed anonymous EXECUTE on `end_live_event(uuid)` and `conic_check_feature_access(uuid,text)`.
- Did not drop tables, truncate data, or modify `auth.users`.

## Verified after applying

- 77 ordinary tables in `public` had RLS enabled; zero had RLS disabled.
- `digital_products` and `product_access` exist and have RLS enabled.
- Anonymous EXECUTE is false for `get_live_attendance`, `end_live_event`, and `conic_check_feature_access`; authenticated EXECUTE is true.
- The remaining unrestricted `qual/with_check = true` policy found by the diagnostic is `whatsapp_plan_limits_read` for authenticated users. It may be intentional reference data and was not changed.
- The security advisor still reports public `SECURITY DEFINER` RPCs that appear designed for public workflows (published funnel retrieval, contact capture, token-based Live access, link click tracking, and license activation). These need endpoint-by-endpoint validation rather than blanket revocation. It also reports Auth leaked-password protection as a dashboard-level setting to review.

## Main table-to-module map

| Application module | Tables found in the active database |
|---|---|
| Auth/profile/workspaces | `profiles`, `organizations`, `organization_members`, `organization_invites` |
| Funnels/page editor/publishing | `funnels`, `funnel_pages`, `funnel_versions`, `funnel_assets`, `forms`, `form_submissions` |
| CRM | `contacts`, `contact_activity`, `contact_segments`, `contact_tags`, `tags` |
| Campaigns/automations | `campaigns`, `automations`, `automation_actions`, `automation_executions`, `automation_action_executions` |
| Links/domains/analytics | `links`, `link_clicks`, `domains`, `page_views`, `conversions`, `site_events`, `site_leads` |
| Payments/checkout | `payment_providers`, `payment_pages`, `payment_page_methods`, `payment_tariffs`, `payment_orders`, `payment_transactions`, `payment_refunds`, `payment_webhook_events`, `payments`, `orders` |
| Digital products/access | `digital_products`, `product_access` |
| Live events | `live_events`, `live_event_participants`, `live_event_sessions`, `live_event_messages`, `live_access_tokens`, `live_cohost_invites`, `live_event_whatsapp_invites` |
| Plans/subscriptions | `conik_plans`, `conik_plan_features`, `conik_subscriptions`, `subscription_billing_catalog`, `subscriptions`, `conic_internal_entitlements` |
| WhatsApp | `whatsapp_connections`, `whatsapp_campaigns`, `whatsapp_campaign_recipients`, `whatsapp_contacts`, `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_templates`, `whatsapp_opt_ins`, `whatsapp_green_instances`, `whatsapp_webhook_events`, plus settings, limits and logs tables |
| Internal licensing/operations | `institutions`, `licenses`, `license_activations`, `license_audit`, `customers`, `platform_secrets`, `desktop_updates` |

## Important application integration gap

A repository code search found no references to `digital_products` or `product_access`. The database tables are installed, but the product editor, public product page, payment-success fulfillment, and secure access-validation API routes are not proven to exist. Do not consider the digital-product feature end-to-end complete until those routes are implemented and tested.

## Files

- `supabase/CONIK_FULL_MIGRATION.sql`: idempotent reconciliation for the existing database, **not** a bootstrap for an empty project.
- `supabase/CONIK_DIAGNOSTIC.sql`: read-only database health checks.
- `supabase/migrations/20261025_conik_safe_reconciliation.sql`
- `supabase/migrations/20261025_remove_unrestricted_site_leads_policy.sql`
- `supabase/migrations/20261025_secure_live_attendance_rpc.sql`

## Execution guidance

The reconciliation and security changes have already been applied to the active Supabase project. Do not blindly replay all historical migrations over production data. Use the diagnostic script, inspect the output, and apply future changes as new timestamped migrations.
