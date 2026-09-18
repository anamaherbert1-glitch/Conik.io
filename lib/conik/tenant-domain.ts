export const CONIK_ROOT_DOMAIN = (process.env.CONIK_ROOT_DOMAIN || 'conik.io').trim().toLowerCase().replace(/^\.+|\.+$/g, '')

export const CONIK_TENANT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

export function getConikTenantFromHost(hostname: string | null | undefined): string | null {
  const host = (hostname || '').split(':')[0].trim().toLowerCase()
  const suffix = `.${CONIK_ROOT_DOMAIN}`
  if (!host.endsWith(suffix)) return null

  const subdomain = host.slice(0, -suffix.length)
  if (!subdomain || subdomain.includes('.')) return null
  if (['www', 'app', 'api', 'admin', 'dashboard', 'login', 'signup', 'auth', 'domains', 'status'].includes(subdomain)) {
    return null
  }
  return CONIK_TENANT_SLUG.test(subdomain) ? subdomain : null
}
