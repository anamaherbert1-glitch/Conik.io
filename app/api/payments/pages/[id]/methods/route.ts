import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getPaymentMethodDefinitions } from '@/lib/payment-method-catalog'
import { z } from 'zod'

const methodSchema = z.object({
  methodCode: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(120).optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
  config: z.record(z.string(), z.unknown()).optional(),
})

const payloadSchema = z.object({
  providerId: z.string().uuid(),
  methods: z.array(methodSchema).max(50),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { id } = await params

  const { data: page, error: pageError } = await supabase
    .from('payment_pages')
    .select('id,organization_id')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })
  if (!page) return NextResponse.json({ error: 'Page de paiement introuvable.' }, { status: 404 })

  const { data, error } = await supabase
    .from('payment_page_methods')
    .select('id,provider_id,method_code,display_name,enabled,sort_order,config')
    .eq('payment_page_id', id)
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ methods: data || [] })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Configuration des moyens de paiement invalide.' }, { status: 400 })

  const { data: page, error: pageError } = await supabase
    .from('payment_pages')
    .select('id,organization_id')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })
  if (!page) return NextResponse.json({ error: 'Page de paiement introuvable.' }, { status: 404 })

  const { data: provider, error: providerError } = await supabase
    .from('payment_providers')
    .select('id,provider,status')
    .eq('id', parsed.data.providerId)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (providerError) return NextResponse.json({ error: providerError.message }, { status: 500 })
  if (!provider || !['connected', 'active'].includes(provider.status)) return NextResponse.json({ error: 'Prestataire non connecté ou inactif.' }, { status: 400 })

  const catalog = new Set(getPaymentMethodDefinitions(provider.provider).map((method) => method.code))
  const invalid = parsed.data.methods.find((method) => !catalog.has(method.methodCode))
  if (invalid) return NextResponse.json({ error: `Moyen de paiement non supporté par ${provider.provider}: ${invalid.methodCode}` }, { status: 400 })

  const { error: deleteError } = await supabase
    .from('payment_page_methods')
    .delete()
    .eq('payment_page_id', id)
    .eq('provider_id', provider.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  if (parsed.data.methods.length) {
    const rows = parsed.data.methods.map((method) => ({
      payment_page_id: id,
      provider_id: provider.id,
      method_code: method.methodCode,
      display_name: method.displayName || null,
      enabled: method.enabled,
      sort_order: method.sortOrder,
      config: method.config || {},
    }))
    const { error: insertError } = await supabase.from('payment_page_methods').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('payment_page_methods')
    .select('id,provider_id,method_code,display_name,enabled,sort_order,config')
    .eq('payment_page_id', id)
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ methods: data || [] })
}
