import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing server environment variable: ${name}`)
  return value
}

export function getMetaConfig() {
  return {
    appId: required('META_APP_ID'),
    appSecret: required('META_APP_SECRET'),
    configId: required('META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID'),
    webhookVerifyToken: required('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    serverSecret: required('WHATSAPP_SERVER_SECRET'),
  }
}

/**
 * Always returns a stable 32-byte AES key. Never throws on key format.
 * Accepts base64 (32 bytes), hex (64 chars), or any string (SHA-256).
 * Fallback chain: WHATSAPP_TOKEN_ENCRYPTION_KEY → WHATSAPP_SERVER_SECRET → META_APP_SECRET → built-in.
 */
export function getEncryptionKey() {
  const candidates = [
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY,
    process.env.WHATSAPP_SERVER_SECRET,
    process.env.META_APP_SECRET,
    'conik-whatsapp-encryption-fallback-v1',
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)

  for (const raw of candidates) {
    try {
      const fromB64 = Buffer.from(raw, 'base64')
      if (fromB64.length === 32) return fromB64
    } catch {
      // ignore invalid base64
    }

    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      try {
        const fromHex = Buffer.from(raw, 'hex')
        if (fromHex.length === 32) return fromHex
      } catch {
        // ignore
      }
    }

    return createHash('sha256').update(raw, 'utf8').digest()
  }

  return createHash('sha256').update('conik-whatsapp-encryption-fallback-v1', 'utf8').digest()
}

export function encryptAccessToken(token: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptAccessToken(value: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(':')
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) throw new Error('Invalid WhatsApp credential format')
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64url')), decipher.final()]).toString('utf8')
}

export function verifyMetaSignatureHmac(rawBody: string, signature: string | null) {
  if (!signature?.startsWith('sha256=')) return false
  const provided = Buffer.from(signature.slice(7), 'hex')
  const expected = createHmac('sha256', getMetaConfig().appSecret).update(rawBody).digest()
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

async function graph<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.error) {
    const message = data?.error?.message || `Meta Graph API error (${response.status})`
    const error = new Error(message) as Error & { meta?: unknown; status?: number }
    error.meta = data?.error
    error.status = response.status
    throw error
  }
  return data as T
}

export async function exchangeEmbeddedSignupCode(code: string) {
  const { appId, appSecret } = getMetaConfig()
  const query = new URLSearchParams({ client_id: appId, client_secret: appSecret, code })
  return graph<{ access_token: string; token_type?: string; expires_in?: number }>(`/oauth/access_token?${query.toString()}`)
}

export async function debugToken(accessToken: string) {
  const { appId, appSecret } = getMetaConfig()
  const appAccessToken = `${appId}|${appSecret}`
  const query = new URLSearchParams({ input_token: accessToken, access_token: appAccessToken })
  return graph<{ data: Record<string, unknown> }>(`/debug_token?${query.toString()}`)
}

export async function listOwnedWabas(accessToken: string, businessId?: string) {
  if (businessId) return graph<{ data: Array<Record<string, unknown>> }>(`/${businessId}/owned_whatsapp_business_accounts?fields=id,name&access_token=${encodeURIComponent(accessToken)}`)
  return graph<{ data: Array<Record<string, unknown>> }>(`/me/businesses?fields=id,name&access_token=${encodeURIComponent(accessToken)}`)
}

export async function listPhoneNumbers(accessToken: string, wabaId: string) {
  return graph<{ data: Array<Record<string, unknown>> }>(`/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status&access_token=${encodeURIComponent(accessToken)}`)
}

export async function getWaba(accessToken: string, wabaId: string) {
  return graph<Record<string, unknown>>(`/${wabaId}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`)
}

export async function subscribeWaba(accessToken: string, wabaId: string) {
  return graph<Record<string, unknown>>(`/${wabaId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`, { method: 'POST', body: JSON.stringify({}) })
}

export async function sendCloudApiMessage(accessToken: string, phoneNumberId: string, payload: Record<string, unknown>) {
  return graph<Record<string, unknown>>(`/${phoneNumberId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  })
}

export async function listMessageTemplates(accessToken: string, wabaId: string) {
  return graph<{ data: Array<Record<string, unknown>> }>(`/${wabaId}/message_templates?fields=id,name,language,category,status,components,quality_score,rejected_reason&limit=250&access_token=${encodeURIComponent(accessToken)}`)
}
