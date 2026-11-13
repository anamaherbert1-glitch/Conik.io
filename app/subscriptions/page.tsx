import { AppShell } from '@/components/app-shell'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { BILLING_ENABLED } from '@/lib/billing/enforce'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
  await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  return (
    <AppShell active="Settings" compact>
      <div style={{ marginBottom: 12 }}>
        <Link href="/settings" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>
          ← Retour aux paramètres
        </Link>
      </div>
      {!BILLING_ENABLED ? (
        <section className="panel" style={{ maxWidth: 760, padding: 28 }}>
          <small>PHASE DE TEST</small>
          <h1>Abonnements temporairement suspendus</h1>
          <p className="muted">
            Conik est actuellement ouvert gratuitement aux utilisateurs qui testent l’application.
            Les forfaits, tarifs, abonnements et historiques sont conservés, mais aucune souscription
            ni aucun paiement ne peut être lancé pendant cette période.
          </p>
          <p>Les fonctionnalités sont accessibles aux membres autorisés de leur espace de travail.</p>
        </section>
      ) : (
        <section className="panel">
          <p>La gestion des abonnements est disponible.</p>
        </section>
      )}
    </AppShell>
  )
}
