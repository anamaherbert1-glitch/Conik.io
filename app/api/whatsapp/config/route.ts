import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getMetaConfig } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'

export async function GET() {
  await requireWorkspaceRole(['owner', 'admin'])
  try {
    const { appId, configId } = getMetaConfig()
    return NextResponse.json({ appId, configId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'WhatsApp Meta configuration missing.' }, { status: 503 })
  }
}
