import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing server environment variable: ${name}`)
  return value
}

export function getGreenApiConfig() {
  return {
    partnerToken: required('GREEN_API_PARTNER_TOKEN'),
    partnerApiUrl: (process.env.GREEN_API_PARTNER_API_URL || 'https://api.green-api.com').replace(/\/$/, ''),
    webhookSecret: required('GREEN_API_WEBHOOK_SECRET'),
  }
}

export type GreenApiInstanceCredentials = {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
  mediaUrl?: string
  typeInstance?: string
}

export function greenApiPartnerUrl(method: string) {
  const { partnerApiUrl, partnerToken } = getGreenApiConfig()
  return `${partnerApiUrl}/partner/${method}/${encodeURIComponent(partnerToken)}`
}

export function createWebhookToken() {
  return randomBytes(32).toString('base64url')
}

export function hashGreenWebhookToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createPartnerInstance(input: { name: string; webhookUrl: string; webhookUrlToken: string }) {
  const response = await fetch(greenApiPartnerUrl('createInstance'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      name: input.name,
      webhookUrl: input.webhookUrl,
      webhookUrlToken: input.webhookUrlToken,
      delaySendMessagesMilliseconds: 1000,
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
      incomingWebhook: 'yes',
      stateWebhook: 'yes',
      keepOnlineStatus: 'no',
      pollMessageWebhook: 'yes',
      incomingCallWebhook: 'yes',
      editedMessageWebhook: 'no',
      deletedMessageWebhook: 'no',
    }),
  })

  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || data.code) {
    const description = typeof data.description === 'string' ? data.description : `GREEN-API createInstance failed (${response.status})`
    throw new Error(description)
  }

  const idInstance = data.idInstance != null ? String(data.idInstance) : ''
  const apiTokenInstance = typeof data.apiTokenInstance === 'string' ? data.apiTokenInstance : ''
  const apiUrl = typeof data.apiUrl === 'string' ? data.apiUrl.replace(/\/$/, '') : ''
  const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl.replace(/\/$/, '') : undefined
  if (!idInstance || !apiTokenInstance || !apiUrl) throw new Error('GREEN-API returned incomplete instance credentials.')

  return { idInstance, apiTokenInstance, apiUrl, mediaUrl }
}
