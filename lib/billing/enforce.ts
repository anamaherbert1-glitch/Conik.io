import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan, type PlanCode, type PlanLimits } from '@/lib/billing/plans'

/**
 * TEMPORARY PUBLIC TEST MODE.
 * Billing and plan enforcement are intentionally bypassed while Conik is tested.
 * Keep subscription tables, plans, checkout code and history intact for later reactivation.
 * Re-enable by changing this flag and restoring the matching database enforcement migration.
 */
export const BILLING_ENABLED = false

export async function getOrganizationPlanCode(_organizationId: string): Promise<PlanCode> {
  if (!BILLING_ENABLED) return 'business'
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('conik_get_plan_access', {
      p_organization_id: _organizationId,
      p_feature_key: 'whatsapp',
    })
    if (error) return 'free'
    const row = Array.isArray(data) ? data[0] : data
    const code = String(row?.plan_code || 'free').toLowerCase()
    if (code === 'basic' || code === 'premium' || code === 'business' || code === 'free') return code as PlanCode
    return 'free'
  } catch {
    return 'free'
  }
}

export async function getOrganizationSubscription(organizationId: string) {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('conik_subscriptions')
      .select('plan_code, status, ends_at, starts_at, amount, currency')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  } catch {
    return null
  }
}

export async function getOrganizationLimits(organizationId: string): Promise<PlanLimits & { plan: PlanCode }> {
  const plan = await getOrganizationPlanCode(organizationId)
  if (!BILLING_ENABLED) {
    const unlimited = Number.MAX_SAFE_INTEGER
    return {
      plan: 'business',
      tunnels: unlimited,
      pagesPerTunnel: unlimited,
      importsHtmlPerMonth: unlimited,
      importZip: true,
      importMaxMb: 200,
      storageMb: unlimited,
      customDomain: true,
      removeBranding: true,
      analytics: 'advanced',
      payments: 'advanced',
      products: unlimited,
      whatsapp: true,
      automations: 'advanced',
      emailsPerMonth: unlimited,
      contacts: unlimited,
      live: true,
      liveCohosts: unlimited,
      teamSeats: unlimited,
      dataExport: true,
      advancedReports: true,
      support: 'dedicated',
    }
  }
  return { plan, ...getPlan(plan).limits }
}

export async function getFunnelOrganizationId(funnelId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('funnels').select('organization_id').eq('id', funnelId).maybeSingle()
    return data?.organization_id || null
  } catch {
    return null
  }
}

export function buildFreeWatermarkHtml(rootUrl = 'https://conik-io.vercel.app') {
  const href = rootUrl.replace(/\/$/, '')
  return `
<a id="conik-free-badge" href="${href}" target="_blank" rel="noopener noreferrer"
  style="position:fixed;bottom:14px;right:14px;z-index:2147483647;display:inline-flex;align-items:center;gap:8px;
  padding:8px 12px 8px 8px;background:rgba(15,23,42,.92);color:#fff;border-radius:999px;text-decoration:none;
  font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.28);
  backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12)">
  <span style="width:24px;height:24px;border-radius:7px;background:#5b5cf0;display:grid;place-items:center;
  font-weight:800;font-size:12px;color:#fff">C</span>
  <span>Made with <b style="font-weight:800">Conik.io</b></span>
  <span aria-hidden="true" style="opacity:.85;font-size:14px;margin-left:2px">→</span>
</a>`.trim()
}

export function assertFeature(
  limits: PlanLimits,
  feature: keyof PlanLimits,
  message: string,
): { ok: true } | { ok: false; error: string } {
  const v = limits[feature]
  if (v === false || v === 'none' || v === 0) {
    return { ok: false, error: message }
  }
  return { ok: true }
}
