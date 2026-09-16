import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
  status: z.enum(['connected', 'active', 'inactive', 'disabled', 'error']).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })

  const { data, error } = await supabase
    .from('payment_providers')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organization.id)
    .select('id,provider,label,status,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ provider: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin'])
  const { id } = await params
  const { error } = await supabase.from('payment_providers').delete().eq('id', id).eq('organization_id', organization.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
