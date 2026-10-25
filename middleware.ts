import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './lib/supabase/config'

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pay',
])
const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/auth/signup',
  '/api/funnels/public',
  '/api/funnels/capture',
  '/api/events/',
  '/api/whatsapp/webhook',
  '/api/lives/access',
  '/api/lives/token',
  '/api/lives/chat',
  '/api/payments/checkout',
  '/api/products/public',
  '/api/products/access',
  '/api/mcp',
  '/r/',
  '/live/',
  '/pay',
  '/p/',
]
const PUBLIC_FUNNEL_RESERVED = new Set([
  'dashboard','login','signup','forgot-password','reset-password','auth','onboarding',
  'funnels','contacts','campaigns','automations','whatsapp','emails','links','analytics',
  'domains','settings','integrations','api','_next','r','segments','lives','live','pay',
  'ventes','p','revenus','performance','subscriptions','admin','tutorial','official',
])
const ROOT_DOMAIN = (process.env.CONIK_ROOT_DOMAIN || 'conik.io').trim().toLowerCase().replace(/^\.+|\.+$/g, '')
const PLATFORM_HOSTS = new Set([
  'conik-io.vercel.app',
  'conik-io-anamaherbert1-glitchs-projects.vercel.app',
  'conik-io-git-main-anamaherbert1-glitchs-projects.vercel.app',
  ROOT_DOMAIN,
  `www.${ROOT_DOMAIN}`,
])
const RESERVED_SUBDOMAINS = new Set([
  'www','app','api','admin','dashboard','login','signup','auth','domains','status',
])
const FUNNEL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i
const FUNNEL_SYSTEM_PATHS = new Set(['api','_next','favicon.ico','r'])

function getWildcardTenant(host: string) {
  if (!host || PLATFORM_HOSTS.has(host)) return null
  const suffix = `.${ROOT_DOMAIN}`
  if (!host.endsWith(suffix)) return null
  const subdomain = host.slice(0, -suffix.length)
  if (!subdomain || subdomain.includes('.') || RESERVED_SUBDOMAINS.has(subdomain)) return null
  return FUNNEL_SLUG.test(subdomain) ? subdomain.toLowerCase() : null
}

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  const segments = pathname.split('/').filter(Boolean)
  return (
    (segments.length === 1 || segments.length === 2) &&
    !PUBLIC_FUNNEL_RESERVED.has(segments[0].toLowerCase())
  )
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
  )
  if (process.env.NODE_ENV === 'production')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = getSupabaseConfig()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const pathname = request.nextUrl.pathname
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const segments = pathname.split('/').filter(Boolean)
  const wildcardTenant = getWildcardTenant(host)

  if (wildcardTenant) {
    if (!segments.length || (segments[0] !== 'api' && segments[0] !== '_next' && segments[0] !== 'favicon.ico')) {
      const urlRewrite = request.nextUrl.clone()
      if (!segments.length) urlRewrite.pathname = `/${wildcardTenant}`
      else if (segments[0] !== wildcardTenant) urlRewrite.pathname = `/${wildcardTenant}${pathname}`
      return addSecurityHeaders(NextResponse.rewrite(urlRewrite))
    }
  }

  await supabase.auth.getUser()
  const { data: { user } } = await supabase.auth.getUser()

  if (isPublicPath(pathname)) return addSecurityHeaders(response)

  if (!user) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname)
    return addSecurityHeaders(NextResponse.redirect(login))
  }

  return addSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
