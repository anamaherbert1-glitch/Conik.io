import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const privateJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })

async function validateAccess(slugInput: unknown, tokenInput: unknown) {
  const slug = typeof slugInput === 'string' ? slugInput.trim() : ''
  const token = typeof tokenInput === 'string' ? tokenInput.trim() : ''

  if (!slug || slug.length > 100 || !token || token.length < 32 || token.length > 256) {
    return privateJson({ error: 'Lien d’accès invalide.' }, 400)
  }

  try {
    const supabase = createAdminClient()
    const { data: access, error } = await supabase
      .from('product_access')
      .select('id,product_id,status,expires_at,order_id')
      .eq('access_token', token)
      .maybeSingle()

    if (error) return privateJson({ error: 'Impossible de vérifier cet accès.' }, 500)
    if (!access) return privateJson({ error: 'Accès introuvable' }, 404)

    if (access.status === 'revoked' || access.status === 'expired') {
      return privateJson({ error: 'Cet accès n’est plus valide.' }, 403)
    }
    if (access.expires_at && new Date(access.expires_at) <= new Date()) {
      return privateJson({ error: 'Accès expiré' }, 403)
    }

    const { data: product, error: productError } = await supabase
      .from('digital_products')
      .select('id,name,slug,product_type,delivery,success_message')
      .eq('id', access.product_id)
      .maybeSingle()

    if (productError) return privateJson({ error: 'Impossible de charger le produit.' }, 500)
    if (!product || product.slug !== slug) {
      return privateJson({ error: 'Produit introuvable' }, 404)
    }

    let status = access.status
    if (status === 'pending' && access.order_id) {
      const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('status')
        .eq('id', access.order_id)
        .maybeSingle()

      if (orderError) return privateJson({ error: 'Impossible de vérifier le paiement.' }, 500)
      if (order?.status === 'paid') {
        const { error: activateError } = await supabase
          .from('product_access')
          .update({ status: 'active', granted_at: new Date().toISOString() })
          .eq('id', access.id)
          .eq('status', 'pending')
        if (activateError) return privateJson({ error: 'Impossible d’activer cet accès.' }, 500)
        status = 'active'
      }
    }

    if (status !== 'active') {
      return privateJson({
        status: 'pending',
        product: { name: product.name, product_type: product.product_type },
        delivery: { instructions: 'Paiement en cours de confirmation. Les fichiers seront disponibles dès validation.' },
        success_message: product.success_message,
      })
    }

    return privateJson({
      status: 'active',
      product: { name: product.name, product_type: product.product_type },
      delivery: product.delivery || {},
      success_message: product.success_message,
    })
  } catch {
    return privateJson({ error: 'Erreur serveur lors de la vérification de l’accès.' }, 500)
  }
}

/** Preferred access check: POST keeps the bearer token out of the URL and access logs. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return privateJson({ error: 'Corps de requête invalide.' }, 400)
  }
  return validateAccess((body as Record<string, unknown>).slug, (body as Record<string, unknown>).token)
}

/** Kept for existing links; new clients should use POST to avoid token exposure in URLs. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  return validateAccess(url.searchParams.get('slug'), url.searchParams.get('token'))
}
