import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { WhatsAppGreenApi } from '@/components/whatsapp-green-api'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  return <AppShell active="WhatsApp">
    <header><div><small>WHATSAPP BUSINESS</small><h1>WhatsApp</h1><p className="muted">GREEN-API, connexion par instance, conversations, templates et automatisations.</p></div></header>
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
      <Link className="outline" href="/whatsapp">Vue d’ensemble</Link><Link className="outline" href="/whatsapp/conversations">Conversations</Link><Link className="outline" href="/whatsapp/templates">Templates</Link><Link className="outline" href="/automations">Automatisations</Link><Link className="outline" href="/settings">Paramètres</Link>
    </nav>
    <WhatsAppGreenApi />
  </AppShell>
}
