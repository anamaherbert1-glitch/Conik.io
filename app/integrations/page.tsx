import { AppShell } from '@/components/app-shell'
import { PaymentProvidersPanel } from '@/components/payment-providers-panel'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  const providersRes = await supabase
    .from('payment_providers')
    .select('id,provider,label,status,created_at')
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })

  const paymentProviders = providersRes.error ? [] : providersRes.data || []

  return (
    <AppShell active="Integrations">
      <header>
        <div>
          <small>INTÉGRATIONS</small>
          <h1>Intégrations</h1>
          <p className="muted">
            Connectez vos prestataires de paiement (Wave, CinetPay, Flutterwave…) à votre espace Conik.
          </p>
        </div>
      </header>

      <section>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Paiements</h2>
        {providersRes.error && (
          <div className="notice" style={{ marginBottom: 12 }}>
            Tables paiement non installées encore. Exécutez la migration SQL{' '}
            <code>20260916120000_payment_pages.sql</code> dans Supabase, puis rechargez cette page.
          </div>
        )}
        <PaymentProvidersPanel initial={paymentProviders} />
      </section>
    </AppShell>
  )
}
