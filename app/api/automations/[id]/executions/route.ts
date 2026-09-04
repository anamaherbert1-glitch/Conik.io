import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { id } = await params
  const { data: automation, error: automationError } = await supabase
    .from('automations').select('id').eq('id', id).eq('organization_id', organization.id).maybeSingle()
  if (automationError) return NextResponse.json({ error: automationError.message }, { status: 500 })
  if (!automation) return NextResponse.json({ error: 'Automatisation introuvable.' }, { status: 404 })

  const { data, error } = await supabase
    .from('automation_executions')
    .select('id,automation_id,contact_id,status,started_at,completed_at,error,created_at')
    .eq('automation_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const executionIds = (data || []).map((x: any) => x.id)
  const { data: actions, error: actionError } = executionIds.length
    ? await supabase.from('automation_action_executions').select('id,automation_execution_id,action_id,status,scheduled_for,started_at,completed_at,attempts,error,result').in('automation_execution_id', executionIds).order('scheduled_for', { ascending: true })
    : { data: [], error: null }
  if (actionError) return NextResponse.json({ error: actionError.message }, { status: 500 })

  return NextResponse.json({
    executions: (data || []).map((x: any) => ({ ...x, actions: (actions || []).filter((a: any) => a.automation_execution_id === x.id) }))
  })
}
