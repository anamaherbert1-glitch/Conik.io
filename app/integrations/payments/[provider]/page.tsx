import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { ConnectProviderForm } from '@/components/connect-provider-form'
import { getGateway } from '@/lib/payment-gateways'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function ConnectProviderPage({
  params,
}: {
  params: Promise<{ provider: string }>
}) {
  const { provider } = await params
  const gateway = getGateway(provider)
  if (!gateway) notFound()

  await requireWorkspaceRole(['owner', 'admin', 'editor'])

  return (
    <AppShell active="Integrations">
      <ConnectProviderForm gateway={gateway} />
    </AppShell>
  )
}
