import { AppShell } from '@/components/app-shell'
import { RevenusDashboard } from '@/components/revenus-dashboard'

export default function RevenusPage() {
  return (
    <AppShell active="Revenus">
      <header>
        <div>
          <small>PILOTAGE COMMERCIAL</small>
          <h1>Revenus</h1>
          <p className="muted">
            Ventes, chiffre d’affaires, calendrier et détail des commandes payées via vos pages de paiement
            Conik.
          </p>
        </div>
      </header>
      <RevenusDashboard />
    </AppShell>
  )
}
