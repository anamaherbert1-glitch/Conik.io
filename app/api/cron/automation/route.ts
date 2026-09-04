import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAutomationAction } from '@/lib/automations/engine'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  if (expected && authorization !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: actions, error } = await supabase.rpc('automation_claim_due_actions', { p_limit: 50 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let completed = 0
  let failed = 0
  for (const action of actions || []) {
    try {
      await sendAutomationAction(supabase, action.id)
      completed++
    } catch {
      failed++
    }
  }
  return NextResponse.json({ ok: true, claimed: actions?.length || 0, completed, failed })
}
