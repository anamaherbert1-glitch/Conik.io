import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export type McpAuthContext = {
  organizationId: string
  keyId: string
  scopes: string[]
  admin: ReturnType<typeof createAdminClient>
}

export function hashMcpKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateMcpKey() {
  const raw = `cnk_${randomBytes(24).toString('base64url')}`
  const prefix = raw.slice(0, 12)
  const key_hash = hashMcpKey(raw)
  return { raw, prefix, key_hash }
}

export async function authenticateMcpRequest(request: Request): Promise<McpAuthContext | { error: string; status: number }> {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  const raw = match?.[1]?.trim()
  if (!raw || !raw.startsWith('cnk_')) {
    return { error: 'Clé MCP manquante ou invalide. Utilisez Authorization: Bearer cnk_…', status: 401 }
  }

  const key_hash = hashMcpKey(raw)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mcp_api_keys')
    .select('id, organization_id, scopes, revoked_at')
    .eq('key_hash', key_hash)
    .maybeSingle()

  if (error) return { error: error.message, status: 500 }
  if (!data || data.revoked_at) return { error: 'Clé MCP révoquée ou introuvable.', status: 401 }

  void admin.from('mcp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  return {
    organizationId: data.organization_id,
    keyId: data.id,
    scopes: Array.isArray(data.scopes) ? data.scopes : ['read', 'write'],
    admin,
  }
}

export function canWrite(scopes: string[]) {
  return scopes.includes('write') || scopes.includes('*')
}

export function canRead(scopes: string[]) {
  return scopes.includes('read') || scopes.includes('write') || scopes.includes('*')
}
