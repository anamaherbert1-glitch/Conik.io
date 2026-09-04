import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { WhatsAppEmbeddedSignup } from '@/components/whatsapp-embedded-signup'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const [{ data: connections }, { data: quota }, { data: stats }] = await Promise.all([
    supabase.from('whatsapp_connections').select('id,waba_id,phone_number_id,display_phone_number,verified_name,status,quality_rating,connected_at,last_synced_at,last_error').eq('organization_id', membership.organizationId).order('connected_at', { ascending: false }),
    supabase.rpc('whatsapp_quota', { p_organization_id: membership.organizationId }),
    supabase.rpc('whatsapp_stats', { p_organization_id: membership.organizationId, p_days: 30 }),
  ])
  return <AppShell active="WhatsApp">
    <header><div><small>WHATSAPP BUSINESS</small><h1>WhatsApp</h1><p className="muted">Connexion Cloud API, conversations, templates et automatisations.</p></div></header>
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
      <Link className="outline" href="/whatsapp">Vue d’ensemble</Link><Link className="outline" href="/whatsapp/conversations">Conversations</Link><Link className="outline" href="/whatsapp/templates">Templates</Link><Link className="outline" href="/automations">Automatisations</Link><Link className="outline" href="/settings">Paramètres</Link>
    </nav>
    <WhatsAppEmbeddedSignup initial={{ connections: connections || [], quota, stats: stats || {} }} />
  </AppShell>
}
