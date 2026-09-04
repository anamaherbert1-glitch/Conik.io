import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createClient } from '@/lib/supabase/server'
import { debugToken, exchangeEmbeddedSignupCode, encryptAccessToken, getWaba, listPhoneNumbers, listOwnedWabas, getMetaConfig, subscribeWaba } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'

const clean = (value: unknown, max = 500) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export async function POST(request: Request) {
  const { user, membership } = await requireWorkspaceRole(['owner', 'admin'])
  const body = await request.json().catch(() => null)
  const code = clean(body?.code, 4000)
  if (!code) return NextResponse.json({ error: 'Le code Embedded Signup est obligatoire.' }, { status: 400 })

  try {
    const token = await exchangeEmbeddedSignupCode(code)
    const tokenDebug = await debugToken(token.access_token)
    const debugData = tokenDebug.data || {}

    const businessId = clean(body?.business_id, 100)
    const requestedWabaId = clean(body?.waba_id, 100)
    const requestedPhoneNumberId = clean(body?.phone_number_id, 100)

    let wabaId = requestedWabaId
    if (!wabaId) {
      const granular = Array.isArray(debugData.granular_scopes) ? debugData.granular_scopes as Array<Record<string, unknown>> : []
      const targetIds = granular.flatMap((scope) => Array.isArray(scope.target_ids) ? scope.target_ids.map(String) : [])
      const candidate = targetIds.find((id) => id.length > 5)
      if (candidate) wabaId = candidate
    }

    let business = businessId
    if (!wabaId) {
      const businesses = await listOwnedWabas(token.access_token, business || undefined)
      if (business) {
        wabaId = clean(businesses.data?.[0]?.id, 100)
      } else {
        business = clean(businesses.data?.[0]?.id, 100)
        if (business) {
          const owned = await listOwnedWabas(token.access_token, business)
          wabaId = clean(owned.data?.[0]?.id, 100)
        }
      }
    }

    if (!wabaId) return NextResponse.json({ error: 'Meta a bien authentifié le compte, mais aucun WABA n’a pu être identifié. Relancez Embedded Signup et conservez les identifiants WABA/numéro retournés par Meta.' }, { status: 422 })

    const waba = await getWaba(token.access_token, wabaId)
    const phones = await listPhoneNumbers(token.access_token, wabaId)
    const phone = phones.data?.find((item) => String(item.id) === requestedPhoneNumberId) || phones.data?.[0]
    const phoneNumberId = clean(phone?.id, 100)
    if (!phoneNumberId) return NextResponse.json({ error: 'Aucun numéro WhatsApp Business n’a été trouvé dans ce WABA.' }, { status: 422 })

    const expiresAt = typeof token.expires_in === 'number' ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null
    const supabase = await createClient()
    const { data: connectionId, error } = await supabase.rpc('whatsapp_upsert_connection', {
      p_secret: getMetaConfig().serverSecret,
      p_organization_id: membership.organizationId,
      p_created_by: user.id,
      p_waba_id: wabaId,
      p_phone_number_id: phoneNumberId,
      p_business_id: business,
      p_display_phone: clean(phone?.display_phone_number, 80),
      p_verified_name: clean(phone?.verified_name, 120),
      p_quality_rating: clean(phone?.quality_rating, 80),
      p_platform_type: 'cloud_api',
      p_token_cipher: encryptAccessToken(token.access_token),
      p_token_expires_at: expiresAt,
      p_metadata: { metaWabaName: clean(waba.name, 200), tokenType: token.token_type || 'bearer', debugAppId: debugData.app_id || null, connectedVia: 'embedded_signup_v4' },
    })
    if (error) throw new Error(error.message)

    let webhookSubscribed = false
    try { await subscribeWaba(token.access_token, wabaId); webhookSubscribed = true } catch (subscriptionError) {
      console.warn('WhatsApp WABA webhook subscription failed', subscriptionError)
    }

    await supabase.from('whatsapp_connections').update({ metadata: { webhookSubscribed, connectedVia: 'embedded_signup_v4' } }).eq('id', connectionId).eq('organization_id', membership.organizationId)

    return NextResponse.json({ ok: true, connectionId, organizationId: membership.organizationId, wabaId, phoneNumberId, displayPhoneNumber: phone?.display_phone_number || null, verifiedName: phone?.verified_name || null, webhookSubscribed })
  } catch (error) {
    console.error('WhatsApp Embedded Signup callback failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Connexion WhatsApp impossible.' }, { status: 502 })
  }
}
