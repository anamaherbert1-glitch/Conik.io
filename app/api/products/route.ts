import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { PRODUCT_TYPES, slugify, type ProductType } from '@/lib/products/types'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase
    .from('digital_products')
    .select('id,name,slug,description,product_type,status,currency,price_cents,attributes,delivery,cover_url,funnel_id,payment_provider_id,enabled_methods,published_at,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}

export async function POST(request: Request) {
  const { supabase, organization, user } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  if (!body?.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Le nom du produit est requis.' }, { status: 400 })
  }
  const productType = String(body.product_type || 'other') as ProductType
  if (!PRODUCT_TYPES.includes(productType)) {
    return NextResponse.json({ error: 'Type de produit invalide.' }, { status: 400 })
  }

  const name = String(body.name).trim().slice(0, 160)
  let slug = body.slug ? slugify(String(body.slug)) : slugify(name)
  const currency = String(body.currency || 'XOF').toUpperCase().slice(0, 3)
  const priceCents = Math.max(0, Math.round(Number(body.price_cents ?? body.price ?? 0)))

  // Ensure unique slug in org
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`
    const { data: existing } = await supabase
      .from('digital_products')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) {
      slug = candidate
      break
    }
  }

  const row = {
    organization_id: organization.id,
    name,
    slug,
    description: body.description ? String(body.description).slice(0, 5000) : null,
    product_type: productType,
    status: body.status === 'published' ? 'published' : 'draft',
    currency,
    price_cents: priceCents,
    attributes: body.attributes && typeof body.attributes === 'object' ? body.attributes : {},
    delivery: body.delivery && typeof body.delivery === 'object' ? body.delivery : {},
    cover_url: body.cover_url ? String(body.cover_url).slice(0, 2000) : null,
    funnel_id: body.funnel_id || null,
    payment_provider_id: body.payment_provider_id || null,
    payment_page_id: body.payment_page_id || null,
    enabled_methods: Array.isArray(body.enabled_methods) ? body.enabled_methods : [],
    success_message: body.success_message ? String(body.success_message).slice(0, 2000) : null,
    created_by: user.id,
    published_at: body.status === 'published' ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase.from('digital_products').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ product: data }, { status: 201 })
}
