import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

export type GreenApiInstanceCredentials = {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
  mediaUrl?: string
  typeInstance?: string
}

function cleanApiUrl(value: string) {
  return value.trim().replace(/\/$/, '')
}

export function normalizeGreenApiCredentials(input: {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}) {
  const idInstance = input.idInstance.trim()
  const apiTokenInstance = input.apiTokenInstance.trim()
  const apiUrl = cleanApiUrl(input.apiUrl)
  if (!/^\d{1,20}$/.test(idInstance)) throw new Error('GREEN-API idInstance invalide.')
  if (!apiTokenInstance || apiTokenInstance.length > 300) throw new Error('GREEN-API apiTokenInstance invalide.')
  if (!/^https:\/\//i.test(apiUrl)) throw new Error('GREEN-API apiUrl doit utiliser HTTPS.')
  return { idInstance, apiTokenInstance, apiUrl }
}

export function createWebhookToken() {
  return randomBytes(32).toString('base64url')
}

export function hashGreenWebhookToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function greenApiInstanceUrl(apiUrl: string, idInstance: string, apiTokenInstance: string, method: string) {
  return `${cleanApiUrl(apiUrl)}/waInstance${encodeURIComponent(idInstance)}/${method}/${encodeURIComponent(apiTokenInstance)}`
}

async function greenApiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' })
  const data = await response.json().catch(() => ({})) as T & { code?: unknown; description?: unknown }
  if (!response.ok || data.code) {
    const description = typeof data.description === 'string' ? data.description : `GREEN-API request failed (${response.status})`
    throw new Error(description)
  }
  return data
}

export async function getInstanceState(input: { apiUrl: string; idInstance: string; apiTokenInstance: string }) {
  return greenApiRequest<{ stateInstance?: string | null }>(greenApiInstanceUrl(input.apiUrl, input.idInstance, input.apiTokenInstance, 'getStateInstance'))
}

export async function getInstanceQr(input: { apiUrl: string; idInstance: string; apiTokenInstance: string }) {
  return greenApiRequest<{ type?: string; message?: string }>(greenApiInstanceUrl(input.apiUrl, input.idInstance, input.apiTokenInstance, 'qr'))
}

export async function configureInstanceWebhook(input: {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
  webhookUrl: string
  webhookUrlToken: string
}) {
  return greenApiRequest<{ saveSettings?: boolean }>(greenApiInstanceUrl(input.apiUrl, input.idInstance, input.apiTokenInstance, 'setSettings'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
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
}
