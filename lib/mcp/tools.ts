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
    description: 'R\u00e9sum\u00e9 de l\u2019espace Conik : organisation, compteurs produits, tunnels, contacts, liens, campagnes, lives.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_products',
    description: 'Lister les produits digitaux / offres de vente.',
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
    description: 'Cr\u00e9er un produit digital (offre de vente).',
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
    description: 'Lister les tunnels marketing.',
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
    description: 'Cr\u00e9er un tunnel marketing.',
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
    description: 'Lister les contacts CRM.',
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
    description: 'Ajouter un contact CRM.',
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
    description: 'Lister les liens track\u00e9s.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
  },
  {
    name: 'create_link',
    description: 'Cr\u00e9er un lien track\u00e9.',
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
  {
    name: 'list_campaigns',
    description: 'Lister les campagnes (WhatsApp / email / internal).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'active', 'paused', 'archived', 'all'] },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_campaign',
    description: 'Cr\u00e9er une campagne marketing.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'active', 'paused', 'archived'] },
        channel: { type: 'string', enum: ['whatsapp', 'email', 'internal'] },
        message: { type: 'string' },
        audience: { type: 'string', enum: ['all_contacts', 'with_phone', 'with_email', 'funnel_leads'] },
        funnel_id: { type: 'string' },
        description: { type: 'string' },
        goal: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_lives',
    description: 'Lister les \u00e9v\u00e9nements Live.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_live',
    description: 'Cr\u00e9er un Live (titre + scheduled_at ISO).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        scheduled_at: { type: 'string' },
        timezone: { type: 'string' },
        slug: { type: 'string' },
      },
      required: ['title', 'scheduled_at'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_revenues_summary',
    description: 'R\u00e9sum\u00e9 revenus / commandes (d\u00e9faut 30 jours).',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string' },
        to: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_whatsapp_status',
    description: '\u00c9tat connexions WhatsApp, quota et stats.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
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

  if (!canRead(scopes) && (name.startsWith('list') || name.startsWith('get_'))) {
    return errResult('Scope read requis.')
  }
  if (!canWrite(scopes) && name.startsWith('create')) return errResult('Scope write requis.')

  switch (name) {
    case 'get_workspace_summary': {
      const [org, products, funnels, contacts, links, campaigns, lives] = await Promise.all([
        admin.from('organizations').select('id,name,slug').eq('id', organizationId).maybeSingle(),
        admin.from('digital_products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('funnels').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('links').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('campaigns').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        admin.from('live_events').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      ])
      return textResult({
        organization: org.data,
        counts: {
          products: products.count ?? 0,
          funnels: funnels.count ?? 0,
          contacts: contacts.count ?? 0,
          links: links.count ?? 0,
          campaigns: campaigns.count ?? 0,
          lives: lives.count ?? 0,
        },
      })
    }
    case 'list_products': {
      let q = admin.from('digital_products').select('id,name,slug,description,product_type,status,currency,price_cents,created_at,updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(Math.min(100, Number(args.limit) || 50))
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
        const { data: existing } = await admin.from('digital_products').select('id').eq('organization_id', organizationId).eq('slug', candidate).maybeSingle()
        if (!existing) { slug = candidate; break }
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
      let q = admin.from('funnels').select('id,name,slug,status,description,created_at,updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(Math.min(100, Number(args.limit) || 50))
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
        const { data: existing } = await admin.from('funnels').select('id').eq('organization_id', organizationId).eq('slug', candidate).maybeSingle()
        if (!existing) { slug = candidate; break }
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
      let q = admin.from('contacts').select('id,email,phone,first_name,last_name,source,created_at,updated_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(Math.min(200, Number(args.limit) || 50))
      const search = args.search ? String(args.search).trim() : ''
      if (search) q = q.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
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
      const { data, error } = await admin.from('links').select('id,slug,destination_url,funnel_id,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(Math.min(100, Number(args.limit) || 50))
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
    case 'list_campaigns': {
      let q = admin.from('campaigns').select('id,name,status,channel,message,audience,funnel_id,description,goal,created_at,updated_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(Math.min(100, Number(args.limit) || 50))
      if (args.status && args.status !== 'all') q = q.eq('status', String(args.status))
      const { data, error } = await q
      if (error) {
        const fallback = await admin.from('campaigns').select('id,name,status,funnel_id,created_at,updated_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(Math.min(100, Number(args.limit) || 50))
        if (fallback.error) return errResult(fallback.error.message)
        return textResult({ campaigns: fallback.data || [] })
      }
      return textResult({ campaigns: data || [] })
    }
    case 'create_campaign': {
      if (!canWrite(scopes)) return errResult('Scope write requis.')
      const nameVal = String(args.name || '').trim()
      if (!nameVal) return errResult('name est requis.')
      const row: Record<string, unknown> = {
        organization_id: organizationId,
        name: nameVal.slice(0, 120),
        status: ['draft', 'active', 'paused', 'archived'].includes(String(args.status || '')) ? String(args.status) : 'draft',
        channel: ['whatsapp', 'email', 'internal'].includes(String(args.channel || '')) ? String(args.channel) : 'whatsapp',
        message: args.message ? String(args.message).slice(0, 2000) : null,
        audience: ['all_contacts', 'with_phone', 'with_email', 'funnel_leads'].includes(String(args.audience || '')) ? String(args.audience) : 'all_contacts',
        funnel_id: args.funnel_id && /^[0-9a-f-]{36}$/i.test(String(args.funnel_id)) ? String(args.funnel_id) : null,
        description: args.description ? String(args.description).slice(0, 800) : null,
        goal: args.goal ? String(args.goal).slice(0, 240) : null,
      }
      const { data, error } = await admin.from('campaigns').insert(row).select('*').single()
      if (error) {
        const retry = await admin.from('campaigns').insert({ organization_id: organizationId, name: row.name, status: row.status, funnel_id: row.funnel_id }).select('*').single()
        if (retry.error) return errResult(retry.error.message)
        return textResult({ campaign: retry.data })
      }
      return textResult({ campaign: data })
    }
    case 'list_lives': {
      let q = admin.from('live_events').select('id,title,description,slug,scheduled_at,ended_at,timezone,status,access_type,chat_enabled,created_at,updated_at').eq('organization_id', organizationId).order('scheduled_at', { ascending: true }).limit(Math.min(100, Number(args.limit) || 50))
      if (args.status) q = q.eq('status', String(args.status))
      const { data, error } = await q
      if (error) return errResult(error.message)
      return textResult({ lives: data || [] })
    }
    case 'create_live': {
      if (!canWrite(scopes)) return errResult('Scope write requis.')
      const title = String(args.title || '').trim()
      const scheduledAt = String(args.scheduled_at || '').trim()
      if (!title || !scheduledAt) return errResult('title et scheduled_at (ISO) sont requis.')
      const parsed = new Date(scheduledAt)
      if (Number.isNaN(parsed.getTime())) return errResult('scheduled_at invalide (ISO 8601).')
      let slug = args.slug ? slugify(String(args.slug)) : slugify(title)
      for (let i = 0; i < 5; i++) {
        const candidate = i === 0 ? slug : `${slug}-${i + 1}`
        const { data: existing } = await admin.from('live_events').select('id').eq('organization_id', organizationId).eq('slug', candidate).maybeSingle()
        if (!existing) { slug = candidate; break }
      }
      const row = {
        organization_id: organizationId,
        title: title.slice(0, 200),
        description: args.description ? String(args.description).slice(0, 2000) : null,
        slug,
        scheduled_at: parsed.toISOString(),
        timezone: args.timezone ? String(args.timezone).slice(0, 80) : 'UTC',
        status: 'scheduled',
        chat_enabled: true,
      }
      const { data, error } = await admin.from('live_events').insert(row).select('*').single()
      if (error) return errResult(error.message)
      return textResult({ live: data })
    }
    case 'get_revenues_summary': {
      const today = new Date()
      const defaultFrom = new Date(Date.now() - 29 * 86400000)
      const fromStr = args.from ? String(args.from) : defaultFrom.toISOString().slice(0, 10)
      const toStr = args.to ? String(args.to) : today.toISOString().slice(0, 10)
      const fromIso = `${fromStr}T00:00:00.000Z`
      const toIso = `${toStr}T23:59:59.999Z`
      const ordersRes = await admin.from('payment_orders').select('id,amount_cents,currency,status,product_label,buyer_email,created_at,paid_at').eq('organization_id', organizationId).gte('created_at', fromIso).lte('created_at', toIso).order('created_at', { ascending: false }).limit(500)
      const orders = ordersRes.error ? [] : ordersRes.data || []
      const paid = orders.filter((o) => String(o.status || '').toLowerCase() === 'paid' || o.paid_at)
      const byCurrency: Record<string, number> = {}
      for (const o of paid) {
        const cur = String(o.currency || 'XOF').toUpperCase()
        byCurrency[cur] = (byCurrency[cur] || 0) + Number(o.amount_cents || 0)
      }
      let conversionsTotal = 0
      const convRes = await admin.from('conversions').select('amount,currency').eq('organization_id', organizationId).gte('created_at', fromIso).lte('created_at', toIso)
      if (!convRes.error) for (const c of convRes.data || []) conversionsTotal += Number(c.amount || 0)
      return textResult({
        period: { from: fromStr, to: toStr },
        orders_count: orders.length,
        paid_count: paid.length,
        revenue_cents_by_currency: byCurrency,
        conversions_amount_fallback: conversionsTotal,
        recent_orders: orders.slice(0, 20),
      })
    }
    case 'get_whatsapp_status': {
      const { data: connections, error } = await admin.from('whatsapp_connections').select('id,display_phone_number,verified_name,status,quality_rating,connected_at,disconnected_at,last_synced_at,last_error').eq('organization_id', organizationId).order('connected_at', { ascending: false })
      if (error) return errResult(error.message)
      let quota: unknown = null
      let stats: unknown = null
      try {
        const q = await admin.rpc('whatsapp_quota', { p_organization_id: organizationId })
        if (!q.error) quota = q.data
      } catch { /* optional */ }
      try {
        const s = await admin.rpc('whatsapp_stats', { p_organization_id: organizationId, p_days: 30 })
        if (!s.error) stats = s.data
      } catch { /* optional */ }
      return textResult({
        connections: connections || [],
        quota,
        stats,
        connected: (connections || []).some((c) => String(c.status || '').toLowerCase() === 'connected'),
      })
    }
    default:
      return errResult(`Outil inconnu: ${name}`)
  }
}
