import { AppShell } from '@/components/app-shell'
import { WhatsAppEmbeddedSignup } from '@/components/whatsapp-embedded-signup'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const [{ data: connections }, { data: quota }, { data: stats }] = await Promise.all([
    supabase.from('whatsapp_connections').select('id,waba_id,phone_number_id,display_phone_number,verified_name,status,quality_rating,connected_at,last_synced_at,last_error').eq('organization_id', membership.organizationId).order('connected_at', { ascending: false }),
    supabase.rpc('whatsapp_quota', { p_organization_id: membership.organizationId }),
    supabase.rpc('whatsapp_stats', { p_organization_id: membership.organizationId, p_days: 30 }),
  ])

  return <AppShell active="Integrations">
    <header><div><small>INTÉGRATIONS</small><h1>Intégrations</h1><p className="muted">Connectez vos propres fournisseurs sans mélanger les comptes entre organisations.</p></div></header>
    <WhatsAppEmbeddedSignup initial={{ connections: connections || [], quota, stats: stats || {} }} />
  </AppShell>
}
