import { AppShell } from '@/components/app-shell'
import { WhatsAppGreenApi } from '@/components/whatsapp-green-api'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getOrganizationLimits } from '@/lib/billing/enforce'
import { UpgradeRequired } from '@/components/billing/upgrade-required'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  const { membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const limits = await getOrganizationLimits(membership.organizationId)
  if (!limits.whatsapp) return <AppShell active="WhatsApp"><UpgradeRequired feature="WhatsApp / Green API" requiredPlan="Premium" /></AppShell>

  return (
    <AppShell active="WhatsApp">
      <header>
        <div>
          <small style={{ color: '#128C7E', fontWeight: 700 }}>INTÉGRATIONS · WHATSAPP</small>
          <h1 style={{ color: '#075E54' }}>WhatsApp</h1>
          <p className="muted">
            Connectez votre propre instance Green API pour utiliser WhatsApp directement depuis le CRM Conik, avec
            synchronisation des contacts et conversations.
          </p>
        </div>
      </header>
      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <a
          href="https://console.green-api.com/registration"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1.5px solid #A7E9C3',
            color: '#075E54',
            background: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Créer un compte Green API
        </a>
        <a
          href="https://console.green-api.com/"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1.5px solid #A7E9C3',
            color: '#075E54',
            background: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          J’ai déjà un compte Green API
        </a>
        <a
          href="/whatsapp/conversations"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#25D366',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
            border: 'none',
          }}
        >
          Conversations
        </a>
      </nav>
      <WhatsAppGreenApi />
    </AppShell>
  )
}
