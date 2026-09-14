import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

function getId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { id } = await params
  const liveId = getId(id)
  if (!liveId) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })

  const { data: live, error: liveError } = await supabase
    .from('live_events')
    .select('id')
    .eq('id', liveId)
    .eq('organization_id', membership.organizationId)
    .maybeSingle()

  if (liveError) return NextResponse.json({ error: liveError.message }, { status: 500 })
  if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })

  const { data, error } = await supabase
    .from('live_event_participants')
    .select('id,live_event_id,contact_id,email,status,invited_at,registered_at,joined_at,created_at,contacts(first_name,last_name,email,phone,status)')
    .eq('live_event_id', liveId)
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participants: data || [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  const liveId = getId(id)
  if (!liveId) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const contactIds = Array.isArray(body?.contact_ids) ? body.contact_ids.filter((value: unknown) => typeof value === 'string') : []

  if (!contactIds.length) {
    return NextResponse.json({ error: 'Sélectionnez au moins un contact CRM.' }, { status: 400 })
  }

  const { data: live, error: liveError } = await supabase
    .from('live_events')
    .select('id')
    .eq('id', liveId)
    .eq('organization_id', membership.organizationId)
    .maybeSingle()

  if (liveError) return NextResponse.json({ error: liveError.message }, { status: 500 })
  if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })

  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id,email')
    .eq('organization_id', membership.organizationId)
    .in('id', contactIds)

  if (contactsError) return NextResponse.json({ error: contactsError.message }, { status: 500 })

  const eligible = (contacts || []).filter((contact) => typeof contact.email === 'string' && contact.email.trim())
  if (!eligible.length) {
    return NextResponse.json({ error: 'Les contacts sélectionnés doivent avoir une adresse e-mail.' }, { status: 400 })
  }

  const rows = eligible.map((contact) => ({
    live_event_id: liveId,
    organization_id: membership.organizationId,
    contact_id: contact.id,
    email: contact.email!.trim().toLowerCase(),
    status: 'invited',
  }))

  const { data, error } = await supabase
    .from('live_event_participants')
    .upsert(rows, { onConflict: 'live_event_id,contact_id', ignoreDuplicates: true })
    .select('id,live_event_id,contact_id,email,status,invited_at,registered_at,joined_at,created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ participants: data || [], added: data?.length || 0 }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  const liveId = getId(id)
  if (!liveId) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const contactId = typeof body?.contact_id === 'string' ? body.contact_id : null
  if (!contactId) return NextResponse.json({ error: 'Contact invalide.' }, { status: 400 })

  const { error } = await supabase
    .from('live_event_participants')
    .delete()
    .eq('live_event_id', liveId)
    .eq('contact_id', contactId)
    .eq('organization_id', membership.organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
