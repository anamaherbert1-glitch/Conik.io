const SUPABASE_URL = 'https://ndsksabyzxfmhnyykcfb.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-adOy-Xd9Xuqugx74Cjklg_CV9EzTfF'

/**
 * Public Supabase connection settings.
 * Vercel environment variables take precedence when configured.
 * The publishable key is intentionally safe to expose in browser code;
 * never put a service_role/secret key here.
 *
 * Keeping the public fallback here also makes production builds resilient
 * when the hosting environment has not yet been provisioned with the
 * NEXT_PUBLIC_* variables.
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY

  return { url, key }
}
