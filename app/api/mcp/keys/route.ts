import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { generateMcpKey } from '@/lib/mcp/auth'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin'])
  const { data, error } = await supabase
    .from('mcp_api_keys')
    .select('id,name,key_prefix,scopes,last_used_at,revoked_at,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    keys: data || [],
    endpoint: '/api/mcp',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://conik-io.vercel.app'),
  })
}

export async function POST(request: Request) {
  const { supabase, organization, user } = await requireWorkspaceRole(['owner', 'admin'])
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'Clé IA'
  const scopes = Array.isArray(body?.scopes) && body.scopes.length
    ? body.scopes.map(String)
    : ['read', 'write']

  const { raw, prefix, key_hash } = generateMcpKey()

  const { data, error } = await supabase
    .from('mcp_api_keys')
    .insert({
      organization_id: organization.id,
      created_by: user.id,
      name,
      key_prefix: prefix,
      key_hash,
      scopes,
    })
    .select('id,name,key_prefix,scopes,created_at')
    .single()

  if (error) {
    if (/mcp_api_keys|relation|does not exist/i.test(error.message)) {
      return NextResponse.json({
        error: 'Table MCP absente. Exécutez la migration supabase/migrations/20261025_mcp_api_keys.sql dans le SQL Editor Supabase.',
      }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    key: data,
    secret: raw,
    warning: 'Copiez cette clé maintenant. Elle ne sera plus affichée.',
  }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin'])
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabase
    .from('mcp_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organization.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
