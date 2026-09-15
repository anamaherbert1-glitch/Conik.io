import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { decryptAccessToken } from '@/lib/whatsapp/meta'
import { getInstanceQr } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin'])

  const { data: instance, error } = await supabase
    .from('whatsapp_green_instances')
    .select('id,id_instance,api_url,api_token_cipher,status')
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!instance) return NextResponse.json({ error: 'Aucune instance GREEN-API.' }, { status: 404 })
  if (instance.status === 'authorized') return NextResponse.json({ type: 'alreadyLogged', message: 'L’instance GREEN-API est déjà connectée.' })

  try {
    const qr = await getInstanceQr({
      apiUrl: instance.api_url,
      idInstance: instance.id_instance,
      apiTokenInstance: decryptAccessToken(instance.api_token_cipher),
    })

    if (qr.type === 'qrCode' && qr.message) {
      return NextResponse.json({ type: 'qrCode', image: `data:image/png;base64,${qr.message}` })
    }

    return NextResponse.json({ type: qr.type || 'unknown', message: qr.message || null })
  } catch (error) {
    return NextResponse.json({
      type: 'error',
      message: error instanceof Error ? error.message : 'Impossible de récupérer le QR code GREEN-API.',
    }, { status: 502 })
  }
}
