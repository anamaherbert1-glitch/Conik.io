import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase.from('contacts').select('id,email,phone,whatsapp_number,first_name,last_name,status,consent_status,custom_fields,last_activity_at,created_at,updated_at').eq('organization_id', membership.organizationId).order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const contacts = (data || []).map((c: any) => ({ ...c, source: c.custom_fields?.source || 'manual', consent_marketing: c.consent_status === 'opted_in' }))
  return NextResponse.json({ contacts })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Contact invalide.' }, { status: 400 })
  const email = text(body.email, 320)?.toLowerCase() || null
  const phone = text(body.phone, 40)
  if (!email && !phone) return NextResponse.json({ error: 'L’e-mail ou le téléphone est obligatoire.' }, { status: 400 })
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })

  const duplicateFilters = [email ? `email.eq.${email}` : '', phone ? `phone.eq.${phone}` : ''].filter(Boolean)
  if (duplicateFilters.length) {
    const { data: duplicate, error: duplicateError } = await supabase.from('contacts').select('id').eq('organization_id', membership.organizationId).or(duplicateFilters.join(',')).limit(1).maybeSingle()
    if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 })
    if (duplicate) return NextResponse.json({ error: 'Un contact avec cet e-mail ou ce téléphone existe déjà.' }, { status: 409 })
  }

  const consent = body.consent_marketing === true
  const customFields = { source: text(body.source, 160) || 'manual' }
  const { data, error } = await supabase.from('contacts').insert({ organization_id: membership.organizationId, email, phone, first_name: text(body.first_name, 120), last_name: text(body.last_name, 120), status: 'lead', consent_status: consent ? 'opted_in' : 'unknown', custom_fields: customFields, last_activity_at: new Date().toISOString() }).select('id,email,phone,first_name,last_name,status,consent_status,custom_fields,created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { error: activityError } = await supabase.from('contact_activity').insert({ contact_id: data.id, organization_id: membership.organizationId, type: 'contact_created', metadata: { source: customFields.source, created_by: user.id } })
  if (activityError) return NextResponse.json({ error: activityError.message }, { status: 500 })

  return NextResponse.json({ contact: { ...data, source: customFields.source, consent_marketing: consent }, createdBy: user.id }, { status: 201 })
}
