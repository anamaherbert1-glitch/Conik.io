import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({ name: z.string().trim().min(1).max(120), status: z.enum(['draft','active','paused']).default('draft'), funnel_id: z.string().uuid().nullable().optional() })

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const { data, error } = await supabase.from('campaigns').select('id,name,status,funnel_id,created_at,updated_at').eq('organization_id', organization.id).order('created_at',{ascending:false})
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({campaigns:data||[]})
}

export async function POST(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner','admin','editor'])
  const parsed = schema.safeParse(await request.json().catch(()=>null))
  if (!parsed.success) return NextResponse.json({error:'Invalid campaign data.'},{status:400})
  if (parsed.data.funnel_id) { const {data:f}=await supabase.from('funnels').select('id').eq('id',parsed.data.funnel_id).eq('organization_id',organization.id).maybeSingle(); if(!f)return NextResponse.json({error:'Funnel does not belong to this workspace.'},{status:400}) }
  const {data,error}=await supabase.from('campaigns').insert({organization_id:organization.id,name:parsed.data.name,status:parsed.data.status,funnel_id:parsed.data.funnel_id||null}).select('id,name,status,funnel_id,created_at,updated_at').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({campaign:data},{status:201})
}
