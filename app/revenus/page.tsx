import { AppShell } from '@/components/app-shell'
import { RevenusDashboard } from '@/components/revenus-dashboard'

export default function RevenusPage() {
  return (
    <AppShell active="Revenus">
      <header>
        <div>
          <small style={{ fontWeight: 700, color: '#64748b', letterSpacing: 0.3 }}>PERFORMANCE</small>
          <h1 style={{ marginTop: 4 }}>Revenus</h1>
          <p className="muted">
            Ventes, chiffre d’affaires et détail des commandes payées via vos pages de paiement Conik.
          </p>
        </div>
      </header>
      <RevenusDashboard />
    </AppShell>
  )
}
