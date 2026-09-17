import { AppShell } from '@/components/app-shell'
import { WhatsAppGreenApi } from '@/components/whatsapp-green-api'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  return <AppShell active="WhatsApp">
    <header>
      <div>
        <small>INTÉGRATIONS · WHATSAPP</small>
        <h1>WhatsApp</h1>
        <p className="muted">Connectez votre propre instance Green API pour utiliser WhatsApp directement depuis le CRM Conik, avec synchronisation des contacts et conversations.</p>
      </div>
    </header>
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
      <a className="outline" href="https://console.green-api.com/registration" target="_blank" rel="noreferrer">Créer un compte Green API</a>
      <a className="outline" href="https://console.green-api.com/" target="_blank" rel="noreferrer">J’ai déjà un compte Green API</a>
      <a className="outline" href="/whatsapp/conversations">Conversations</a>
    </nav>
    <WhatsAppGreenApi />
  </AppShell>
}
