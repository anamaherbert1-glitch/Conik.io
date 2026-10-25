import type { McpAuthContext } from './auth'
import { canRead, canWrite } from './auth'

export type McpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'get_workspace_summary',
    description: 'R\u00e9sum\u00e9 de l\u2019espace Conik : organisation, compteurs produits, tunnels, contacts, liens.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_products',
    description: 'Lister les produits digitaux / offres de vente de l\u2019organisation.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'published', 'all'] },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_product',
    description: 'Cr\u00e9er un produit digital (offre de vente) dans Conik.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price_cents: { type: 'number' },
        currency: { type: 'string' },
        product_type: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published'] },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_funnels',
    description: 'Lister les tunnels (funnels) marketing de l\u2019organisation.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'published', 'archived', 'all'] },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_funnel',
    description: 'Cr\u00e9er un tunnel marketing (funnel) dans Conik.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published'] },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_contacts',
    description: 'Lister les contacts CRM de l\u2019organisation.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 200 },
        search: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_contact',
    description: 'Ajouter un contact dans le CRM Conik.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        source: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_links',
    description: 'Lister les liens track\u00e9s de l\u2019organisation.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
  },
  {
    name: 'create_link',
    description: 'Cr\u00e9er un lien track\u00e9 (short link) dans Conik.',
    inputSchema: {
      type: 'object',
      properties: {
        destination_url: { type: 'string' },
        slug: { type: 'string' },
        funnel_id: { type: 'string' },
      },
      required: ['destination_url'],
      additionalProperties: false,
    },
  },
]

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'item'
  )
}

function textResult(data: unknown) {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  }
}

function errResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  }
}

export async function callMcpTool(ctx: McpAuthContext, name: string, args: Record<string, unknown> = {}) {
  const { admin, organizationId, scopes } = ctx

  if (!canRead(scopes) && name.startsWith('list')) return errResult('Scope read requis.')
  if (!canWrite(scopes) && name.startsWith('create')) return errResult('Scope write requis.')

  switch (name) {
    case 'get_workspace_summary': {
      const [org, products, funnels, contacts, links] = await Promise.all([
        admin.from('organizations').select('id,name,slug').eq('id', organizationId).maybeSingle(),
        admin.from('digital_products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('funnels').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('links').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      ])
      return textResult({
        organization: org.data,
        counts: {
          products: products.count ?? 0,
          funnels: funnels.count ?? 0,
          contacts: contacts.count ?? 0,
          links: links.count ?? 0,
        },
      })
    }
    case 'list_products': {
      let q = admin
        .from('digital_products')
        .select('id,name,slug,description,product_type,status,currency,price_cents,created_at,updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(Math.min(100, Number(args.limit) || 50))
      if (args.status && args.status !== 'all') q = q.eq('status', String(args.status))
      const { data, error } = await q
      if (error) return errResult(error.message)
      return textResult({ products: data || [] })
    }
    case 'create_product': {
      if (!canWrite(scopes)) return errResult('Scope write requis.')
      const nameVal = String(args.name || '').trim()
      if (nameVal.length < 2) return errResult('name est requis.')
      let slug = slugify(nameVal)
      for (let i = 0; i < 5; i++) {
        const candidate = i === 0 ? slug : `${slug}-${i + 1}`
        const { data: existing } = await admin
          .from('digital_products')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('slug', candidate)
          .maybeSingle()
        if (!existing) {
          slug = candidate
          break
        }
      }
      const row = {
        organization_id: organizationId,
        name: nameVal.slice(0, 160),
        slug,
        description: args.description ? String(args.description).slice(0, 5000) : null,
        product_type: String(args.product_type || 'other').slice(0, 40),
        status: args.status === 'published' ? 'published' : 'draft',
        currency: String(args.currency || 'XOF').toUpperCase().slice(0, 3),
        price_cents: Math.max(0, Math.round(Number(args.price_cents || 0))),
        attributes: {},
        delivery: {},
        published_at: args.status === 'published' ? new Date().toISOString() : null,
      }
      const { data, error } = await admin.from('digital_products').insert(row).select('*').single()
      if (error) return errResult(error.message)
      return textResult({ product: data })
    }
    case 'list_funnels': {
      let q = admin
        .from('funnels')
        .select('id,name,slug,status,description,created_at,updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(Math.min(100, Number(args.limit) || 50))
      if (args.status && args.status !== 'all') q = q.eq('status', String(args.status))
      const { data, error } = await q
      if (error) return errResult(error.message)
      return textResult({ funnels: data || [] })
    }
    case 'create_funnel': {
      if (!canWrite(scopes)) return errResult('Scope write requis.')
      const nameVal = String(args.name || '').trim()
      if (nameVal.length < 2) return errResult('name est requis.')
      let slug = args.slug ? slugify(String(args.slug)) : slugify(nameVal)
      for (let i = 0; i < 5; i++) {
        const candidate = i === 0 ? slug : `${slug}-${i + 1}`
        const { data: existing } = await admin
          .from('funnels')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('slug', candidate)
          .maybeSingle()
        if (!existing) {
          slug = candidate
          break
        }
      }
      const row = {
        organization_id: organizationId,
        name: nameVal.slice(0, 160),
        slug,
        description: args.description ? String(args.description).slice(0, 2000) : null,
        status: args.status === 'published' ? 'published' : 'draft',
        source: 'ai',
      }
      const { data, error } = await admin.from('funnels').insert(row).select('*').single()
      if (error) return errResult(error.message)
      return textResult({ funnel: data })
    }
    case 'list_contacts': {
      let q = admin
        .from('contacts')
        .select('id,email,phone,first_name,last_name,source,created_at,updated_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(Math.min(200, Number(args.limit) || 50))
      const search = args.search ? String(args.search).trim() : ''
      if (search) {
        q = q.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }
      const { data, error } = await q
      if (error) return errResult(error.message)
      return textResult({ contacts: data || [] })
    }
    case 'create_contact': {
      if (!canWrite(scopes)) return errResult('Scope write requis.')
      const email = args.email ? String(args.email).trim().toLowerCase().slice(0, 320) : null
      const phone = args.phone ? String(args.phone).trim().slice(0, 40) : null
      if (!email && !phone) return errResult('email ou phone requis.')
      const row = {
        organization_id: organizationId,
        email,
        phone,
        first_name: args.first_name ? String(args.first_name).slice(0, 80) : null,
        last_name: args.last_name ? String(args.last_name).slice(0, 80) : null,
        source: args.source ? String(args.source).slice(0, 80) : 'mcp',
        consent_marketing: false,
      }
      const { data, error } = await admin.from('contacts').insert(row).select('*').single()
      if (error) return errResult(error.message)
      return textResult({ contact: data })
    }
    case 'list_links': {
      const { data, error } = await admin
        .from('links')
        .select('id,slug,destination_url,funnel_id,created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(Math.min(100, Number(args.limit) || 50))
      if (error) return errResult(error.message)
      return textResult({ links: data || [] })
    }
    case 'create_link': {
      if (!canWrite(scopes)) return errResult('Scope write requis.')
      const destination = String(args.destination_url || '').trim()
      if (!/^https?:\/\//i.test(destination)) return errResult('destination_url doit \u00eatre http(s).')
      const slug = args.slug ? slugify(String(args.slug)) : Math.random().toString(36).slice(2, 9)
      const row = {
        organization_id: organizationId,
        slug,
        destination_url: destination,
        funnel_id: args.funnel_id && /^[0-9a-f-]{36}$/i.test(String(args.funnel_id)) ? String(args.funnel_id) : null,
      }
      const { data, error } = await admin.from('links').insert(row).select('*').single()
      if (error) return errResult(error.message)
      return textResult({ link: data })
    }
    default:
      return errResult(`Outil inconnu: ${name}`)
  }
}
