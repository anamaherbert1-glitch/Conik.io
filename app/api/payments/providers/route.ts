import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const PROVIDERS = [
  'wave',
  'cinetpay',
  'flutterwave',
  'paydunya',
  'saspay',
  'ligdicash',
  'hub2',
  'fedapay',
  'campay',
  'other',
] as const

const schema = z.object({
  provider: z.enum(PROVIDERS),
  label: z.string().trim().min(1).max(120),
  credentials: z.record(z.string(), z.string()).default({}),
})

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase
    .from('payment_providers')
    .select('id,provider,label,status,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ providers: data || [] })
}

export async function POST(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données prestataire invalides.' }, { status: 400 })

  const { data, error } = await supabase
    .from('payment_providers')
    .insert({
      organization_id: organization.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      credentials: parsed.data.credentials,
      status: 'connected',
    })
    .select('id,provider,label,status,created_at')
    .single()

  if (error) {
    if (error.message?.includes('check') || error.code === '23514') {
      return NextResponse.json(
        {
          error:
            'La base n’accepte pas encore ce prestataire. Exécutez la migration SQL 20260916131000_payment_providers_saspay.sql dans Supabase.',
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ provider: data }, { status: 201 })
}
