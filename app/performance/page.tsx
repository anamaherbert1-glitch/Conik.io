import { AppShell } from '@/components/app-shell'
import { PerformanceDashboard } from '@/components/performance-dashboard'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  return (
    <AppShell active="Performance">
      <header>
        <div>
          <small style={{ fontWeight: 700, letterSpacing: 0.4, color: '#64748b' }}>PILOTAGE</small>
          <h1 style={{ marginTop: 4 }}>Performance</h1>
          <p className="muted">
            Trafic, conversions, ventes et chiffre d’affaires — une seule vue pour piloter vos tunnels et pages de
            paiement.
          </p>
        </div>
      </header>
      <PerformanceDashboard />
    </AppShell>
  )
}
