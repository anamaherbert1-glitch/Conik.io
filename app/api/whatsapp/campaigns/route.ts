import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const text = (v: unknown, max = 500) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const { data, error } = await supabase.from('whatsapp_campaigns').select('id,name,status,template_id,template_name,template_language,audience_type,audience_config,total_recipients,sent_count,delivered_count,read_count,failed_count,skipped_count,scheduled_at,started_at,completed_at,last_error,created_at,updated_at').eq('organization_id', membership.organizationId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data || [] })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner','admin','editor'])
  const body = await request.json().catch(() => null)
  const name = text(body?.name, 160)
  const connectionId = uuid(body?.connectionId)
  const templateId = uuid(body?.templateId)
  const audienceType = text(body?.audienceType, 40) || 'all_opted_in'
  const audienceConfig = body?.audienceConfig && typeof body.audienceConfig === 'object' && !Array.isArray(body.audienceConfig) ? body.audienceConfig : {}
  const variableMapping = body?.variableMapping && typeof body.variableMapping === 'object' && !Array.isArray(body.variableMapping) ? body.variableMapping : {}
  if (!name || !connectionId || !templateId) return NextResponse.json({ error: 'Nom, connexion WhatsApp et template sont obligatoires.' }, { status: 400 })
  if (!['all_opted_in','tag','segment','funnel','manual'].includes(audienceType)) return NextResponse.json({ error: 'Audience invalide.' }, { status: 400 })

  const { data: connection } = await supabase.from('whatsapp_connections').select('id,status').eq('id', connectionId).eq('organization_id', membership.organizationId).maybeSingle()
  if (!connection || connection.status !== 'connected') return NextResponse.json({ error: 'Connexion WhatsApp inactive.' }, { status: 409 })
  const { data: template } = await supabase.from('whatsapp_templates').select('id,name,language,status').eq('id', templateId).eq('organization_id', membership.organizationId).eq('connection_id', connectionId).maybeSingle()
  if (!template || template.status !== 'APPROVED') return NextResponse.json({ error: 'Le template doit être approuvé par Meta.' }, { status: 409 })

  let contactsQuery = supabase.from('contacts').select('id,phone,whatsapp_number,first_name,last_name').eq('organization_id', membership.organizationId).eq('consent_status','opted_in').not('whatsapp_number','is',null)
  if (audienceType === 'funnel') {
    const funnelId = uuid(audienceConfig.funnelId)
    if (!funnelId) return NextResponse.json({ error: 'Funnel d’audience invalide.' }, { status: 400 })
    contactsQuery = contactsQuery.eq('source_funnel_id', funnelId)
  }
  if (audienceType === 'manual') {
    const ids = Array.isArray(audienceConfig.contactIds) ? audienceConfig.contactIds.filter((v: unknown): v is string => Boolean(uuid(v))).slice(0, 5000) : []
    if (!ids.length) return NextResponse.json({ error: 'Aucun contact sélectionné.' }, { status: 400 })
    contactsQuery = contactsQuery.in('id', ids)
  }
  if (audienceType === 'tag') {
    const tagId = uuid(audienceConfig.tagId)
    if (!tagId) return NextResponse.json({ error: 'Tag d’audience invalide.' }, { status: 400 })
    const { data: tagged, error: tagError } = await supabase.from('contact_tags').select('contact_id').eq('tag_id', tagId)
    if (tagError) return NextResponse.json({ error: tagError.message }, { status: 500 })
    const ids = (tagged || []).map((r: any) => r.contact_id).filter(Boolean).slice(0, 5000)
    if (!ids.length) return NextResponse.json({ error: 'Aucun contact dans ce tag.' }, { status: 400 })
    contactsQuery = contactsQuery.in('id', ids)
  }
  if (audienceType === 'segment') return NextResponse.json({ error: 'Les segments seront activés après validation de leurs règles. Utilisez tag, funnel ou manuel pour cette campagne.' }, { status: 400 })

  const { data: contacts, error: contactsError } = await contactsQuery.limit(5000)
  if (contactsError) return NextResponse.json({ error: contactsError.message }, { status: 500 })
  if (!contacts?.length) return NextResponse.json({ error: 'Aucun contact WhatsApp éligible.' }, { status: 409 })

  const { data: campaign, error: campaignError } = await supabase.from('whatsapp_campaigns').insert({ organization_id: membership.organizationId, connection_id: connectionId, created_by: user.id, name, template_id: template.id, template_name: template.name, template_language: template.language, variable_mapping: variableMapping, audience_type: audienceType, audience_config: audienceConfig, status: 'draft', total_recipients: contacts.length }).select().single()
  if (campaignError || !campaign) return NextResponse.json({ error: campaignError?.message || 'Création impossible.' }, { status: 500 })

  const recipients = contacts.map((c: any) => ({ organization_id: membership.organizationId, campaign_id: campaign.id, contact_id: c.id, phone_number: String(c.whatsapp_number || c.phone).replace(/\D/g,''), variables: Object.fromEntries(Object.entries(variableMapping).map(([k,v]) => [k, String(v).replace(/\{\{first_name\}\}/gi, c.first_name || '').replace(/\{\{last_name\}\}/gi, c.last_name || '')])) }))
  const { error: recipientsError } = await supabase.from('whatsapp_campaign_recipients').insert(recipients)
  if (recipientsError) {
    await supabase.from('whatsapp_campaigns').delete().eq('id', campaign.id).eq('organization_id', membership.organizationId)
    return NextResponse.json({ error: recipientsError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, campaign }, { status: 201 })
}
