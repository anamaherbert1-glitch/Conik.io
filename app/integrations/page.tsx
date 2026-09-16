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
          <small>PASSERELLES DE PAIEMENT</small>
          <h1>Passerelles de paiement</h1>
          <p className="muted">
            Connectez vos prestataires (CinetPay, Flutterwave, Wave, PayDunya…) comme sur systeme.io. L’argent va sur
            votre compte marchand.
          </p>
        </div>
      </header>

      <section>
        {providersRes.error && (
          <div className="notice" style={{ marginBottom: 12 }}>
            Tables paiement non installées. Exécutez dans Supabase :{' '}
            <code>20260916120000_payment_pages.sql</code> puis{' '}
            <code>20260916130000_payment_providers_expand.sql</code>.
          </div>
        )}
        <PaymentProvidersPanel initial={paymentProviders} />
      </section>
    </AppShell>
  )
}
