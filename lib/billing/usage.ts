import { createClient } from '@/lib/supabase/server'

export type UsageKey = 'tunnels' | 'pages' | 'importsHtml' | 'contacts' | 'storage'

export async function checkOrganizationUsage(organizationId: string, usageKey: UsageKey) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('conik_check_usage', {
    p_organization_id: organizationId,
    p_usage_key: usageKey,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row?.allowed === true,
    current: Number(row?.current_value || 0),
    limit: Number(row?.limit_value || 0),
    period: row?.limit_period || null,
    plan: String(row?.plan_code || 'free'),
  }
}
