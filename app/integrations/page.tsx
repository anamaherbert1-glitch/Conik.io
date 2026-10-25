import { Suspense } from 'react'
import { AppShell } from '@/components/app-shell'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { UpgradeRequired } from '@/components/billing/upgrade-required'
import { getOrganizationLimits } from '@/lib/billing/enforce'
import { IntegrationsHub } from '@/components/integrations-hub'

export const dynamic = 'force-dynamic'

type Props = { searchParams?: Promise<{ tab?: string }> | { tab?: string } }

export default async function IntegrationsPage({ searchParams }: Props) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams
  const tab = String(sp?.tab || 'payments').toLowerCase()

  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  if (tab === 'payments' || tab === '') {
    const limits = await getOrganizationLimits(membership.organizationId)
    if (limits.payments === 'none') {
      return (
        <AppShell active="Integrations">
          <UpgradeRequired feature="Paiements" requiredPlan="Basic" />
        </AppShell>
      )
    }
  }

  const providersRes = await supabase
    .from('payment_providers')
    .select('id,provider,label,status,created_at')
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })

  const paymentProviders = providersRes.error ? [] : providersRes.data || []

  const title =
    tab === 'mcp'
      ? {
          small: 'INTELLIGENCE ARTIFICIELLE',
          h1: 'Conik MCP',
          muted: 'Connectez Grok, Claude ou Cursor \u00e0 votre espace Conik.',
        }
      : tab === 'whatsapp'
        ? {
            small: 'MESSAGERIE',
            h1: 'WhatsApp',
            muted: 'Connexion Meta / Green API, conversations et campagnes.',
          }
        : {
            small: 'INT\u00c9GRATIONS',
            h1: 'Int\u00e9grations',
            muted: 'Paiements, WhatsApp et MCP (IA) pour automatiser votre business.',
          }

  return (
    <AppShell active="Integrations">
      <header>
        <div>
          <small>{title.small}</small>
          <h1>{title.h1}</h1>
          <p className="muted">{title.muted}</p>
        </div>
      </header>

      <Suspense fallback={<p className="muted">Chargement\u2026</p>}>
        <IntegrationsHub
          paymentProviders={paymentProviders as any}
          paymentsError={providersRes.error ? providersRes.error.message : null}
        />
      </Suspense>
    </AppShell>
  )
}
