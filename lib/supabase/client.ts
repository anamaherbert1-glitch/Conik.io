import { createBrowserClient } from '@supabase/ssr'

// Keep the browser client build-safe: public Supabase values have safe fallbacks
// so a missing Vercel NEXT_PUBLIC_* variable cannot break static prerendering.
const SUPABASE_URL = 'https://ndsksabyzxfmhnyykcfb.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-adOy-Xd9Xuqugx74Cjklg_CV9EzTfF'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    SUPABASE_PUBLISHABLE_KEY

  return createBrowserClient(url, key)
}
