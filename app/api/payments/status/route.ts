import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantProductAccessOnPaid } from '@/lib/products/grant-access'

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

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get('order')?.trim()
  if (!orderNumber || orderNumber.length > 80) {
    return privateJson({ error: 'Référence de commande invalide.' }, 400)
  }

  try {
    const supabase = createAdminClient()
    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('id,organization_id,order_number,status,paid_at,total_amount,currency,product_label,metadata,tariff_id,customer_email,buyer_email,customer_first_name,customer_last_name,customer_phone,buyer_phone')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (error) return privateJson({ error: 'Impossible de vérifier cette commande.' }, 500)
    if (!order) return privateJson({ error: 'Commande introuvable' }, 404)

    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('status,method_code')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (transactionError) {
      return privateJson({ error: 'Impossible de vérifier la transaction.' }, 500)
    }

    const paid =
      order.status === 'paid' ||
      transaction?.status === 'succeeded' ||
      transaction?.status === 'paid'

    let delivery: {
      access_token?: string
      product_slug?: string
      product_name?: string
      file_url?: string
      video_url?: string
      course_url?: string
      instructions?: string
      success_message?: string | null
    } | null = null

    if (paid) {
      const access = await grantProductAccessOnPaid(supabase, order)
      if (access?.product_id) {
        const { data: product } = await supabase
          .from('digital_products')
          .select('name,slug,delivery,success_message')
          .eq('id', access.product_id)
          .eq('organization_id', order.organization_id)
          .maybeSingle()

        if (product) {
          const d = (product.delivery || {}) as Record<string, string>
          delivery = {
            access_token: access.access_token,
            product_slug: product.slug,
            product_name: product.name,
            file_url: d.file_url,
            video_url: d.video_url,
            course_url: d.course_url,
            instructions: d.instructions,
            success_message: product.success_message,
          }
        }
      }
    }

    // Never expose buyer email, phone, internal metadata, organization IDs,
    // or provider transaction references from this public polling endpoint.
    return privateJson({
      order: {
        order_number: order.order_number,
        status: order.status,
        paid_at: order.paid_at,
        total_amount: order.total_amount,
        currency: order.currency,
        product_label: order.product_label,
      },
      transaction: transaction
        ? { status: transaction.status, method_code: transaction.method_code }
        : null,
      delivery,
    })
  } catch {
    return privateJson({ error: 'Erreur serveur lors de la vérification du paiement.' }, 500)
  }
}
