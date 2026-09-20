import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_ADMINS = ['eliteone003@gmail.com', 'anamaspenser@gmail.com', 'joih852@gmail.com']

export function getPlatformAdminEmails() {
  const fromEnv = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return new Set([...DEFAULT_ADMINS, ...fromEnv])
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false
  return getPlatformAdminEmails().has(email.trim().toLowerCase())
}

export async function requirePlatformAdmin(options?: { api?: boolean }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    if (options?.api) throw new Error('Non authentifié')
    redirect('/login?next=/admin')
  }

  const email = data.user.email || ''
  if (!isPlatformAdminEmail(email)) {
    if (options?.api) throw new Error('Accès administrateur refusé')
    redirect('/dashboard?error=admin_forbidden')
  }

  let admin = null as ReturnType<typeof createAdminClient> | null
  try {
    admin = createAdminClient()
  } catch {
    admin = null
  }

  return { supabase, user: data.user, admin, email }
}
