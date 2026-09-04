import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function GET(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 25)))
  const q = (url.searchParams.get('q') || '').trim()
  const from = (page - 1) * limit
  let query = supabase.from('whatsapp_conversations').select('id,contact_id,whatsapp_contact_id,connection_id,status,last_message_at,last_inbound_at,unread_count,started_at,closed_at', { count: 'exact' }).eq('organization_id', membership.organizationId).order('last_message_at', { ascending: false, nullsFirst: false }).range(from, from + limit - 1)
  if (q) query = query.ilike('status', `%${q}%`)
  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const contactIds = [...new Set((data || []).map((x: any) => x.contact_id).filter(Boolean))]
  const { data: contacts } = contactIds.length ? await supabase.from('contacts').select('id,first_name,last_name,email,phone,whatsapp_number').in('id', contactIds) : { data: [] }
  const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]))
  return NextResponse.json({ conversations: (data || []).map((x: any) => ({ ...x, contact: contactMap.get(x.contact_id) || null })), page, limit, total: count || 0, hasMore: (count || 0) > from + (data || []).length })
}
