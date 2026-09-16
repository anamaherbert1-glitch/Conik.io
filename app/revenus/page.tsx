import { AppShell } from '@/components/app-shell'
import { RevenusDashboard } from '@/components/revenus-dashboard'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function RevenusPage() {
  await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  return (
    <AppShell active="Revenus">
      <RevenusDashboard />
    </AppShell>
  )
}
