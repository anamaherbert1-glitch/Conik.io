import 'server-only'

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
