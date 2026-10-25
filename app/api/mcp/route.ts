import { NextResponse } from 'next/server'
import { authenticateMcpRequest } from '@/lib/mcp/auth'
import { MCP_TOOLS, callMcpTool } from '@/lib/mcp/tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SERVER_INFO = {
  name: 'conik',
  version: '1.0.0',
  title: 'Conik MCP',
  description: 'Connectez une IA à votre espace Conik : produits, tunnels, contacts, liens.',
}

function jsonRpc(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

export async function GET() {
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    title: SERVER_INFO.title,
    description: SERVER_INFO.description,
    protocol: 'mcp',
    transport: 'streamable-http',
    endpoint: '/api/mcp',
    auth: 'Bearer cnk_… (clé générée dans Paramètres → Conik MCP)',
    tools: MCP_TOOLS.map((t) => t.name),
  })
}

export async function POST(request: Request) {
  const auth = await authenticateMcpRequest(request)
  if ('error' in auth) {
    return NextResponse.json(jsonRpcError(null, -32001, auth.error), { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json(jsonRpcError(null, -32700, 'Parse error'), { status: 400 })
  }

  if (Array.isArray(body)) {
    const results = []
    for (const msg of body) {
      results.push(await handleMessage(auth, msg))
    }
    return NextResponse.json(results)
  }

  const result = await handleMessage(auth, body)
  return NextResponse.json(result)
}

async function handleMessage(auth: Exclude<Awaited<ReturnType<typeof authenticateMcpRequest>>, { error: string }>, msg: any) {
  const method = String(msg?.method || '')
  const id = msg?.id
  const params = msg?.params && typeof msg.params === 'object' ? msg.params : {}

  switch (method) {
    case 'initialize':
      return jsonRpc(id, {
        protocolVersion: params.protocolVersion || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      })
    case 'notifications/initialized':
    case 'initialized':
      return jsonRpc(id ?? 0, { ok: true })
    case 'ping':
      return jsonRpc(id, {})
    case 'tools/list':
      return jsonRpc(id, {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      })
    case 'tools/call': {
      const name = String(params.name || '')
      const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>
      if (!name) return jsonRpcError(id, -32602, 'params.name requis')
      const toolResult = await callMcpTool(auth, name, args)
      return jsonRpc(id, toolResult)
    }
    case 'resources/list':
      return jsonRpc(id, { resources: [] })
    case 'prompts/list':
      return jsonRpc(id, { prompts: [] })
    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
    },
  })
}
