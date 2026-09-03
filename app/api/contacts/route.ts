import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase.from('contacts').select('id,email,phone,first_name,last_name,source,consent_marketing,created_at,updated_at').eq('organization_id', membership.organizationId).order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data || [] })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid contact.' }, { status: 400 })
  const text = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
  const email = text(body.email, 320)?.toLowerCase() || null
  const phone = text(body.phone, 40)
  if (!email && !phone) return NextResponse.json({ error: 'Email or phone is required.' }, { status: 400 })
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
  const { data, error } = await supabase.from('contacts').insert({ organization_id: membership.organizationId, email, phone, first_name: text(body.first_name, 120), last_name: text(body.last_name, 120), source: text(body.source, 160) || 'manual', consent_marketing: body.consent_marketing === true }).select('id,email,phone,first_name,last_name,source,consent_marketing,created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ contact: data, createdBy: user.id }, { status: 201 })
}
