import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createClient } from '@/lib/supabase/server'
import { decryptAccessToken, listMessageTemplates, getMetaConfig } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data: connection } = await supabase.from('whatsapp_connections').select('id,waba_id,status').eq('organization_id', membership.organizationId).eq('status', 'connected').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!connection) return NextResponse.json({ templates: [], message: 'Aucune connexion WhatsApp active.' })

  const { data: credential, error: credentialError } = await supabase.rpc('whatsapp_get_credential', { p_secret: getMetaConfig().serverSecret, p_connection_id: connection.id })
  if (credentialError) return NextResponse.json({ error: credentialError.message }, { status: 500 })
  const row = Array.isArray(credential) ? credential[0] : credential
  if (!row?.access_token_cipher) return NextResponse.json({ error: 'Credential WhatsApp indisponible.' }, { status: 409 })

  try {
    const remote = await listMessageTemplates(decryptAccessToken(row.access_token_cipher), connection.waba_id)
    const { error } = await supabase.rpc('whatsapp_sync_templates', { p_connection_id: connection.id, p_templates: remote.data || [] })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: templates } = await supabase.from('whatsapp_templates').select('id,meta_template_id,name,language,category,status,components,variables,rejection_reason,quality_score,last_synced_at').eq('organization_id', membership.organizationId).eq('connection_id', connection.id).order('name')
    return NextResponse.json({ templates: templates || [], synced: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Synchronisation Meta impossible.' }, { status: 502 })
  }
}
