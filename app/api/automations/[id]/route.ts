import {NextResponse} from 'next/server'
import {requireWorkspaceRole} from '@/lib/auth/require-user'
import {z} from 'zod'

const triggerTypes=['new_contact','form_submission','whatsapp_message_received','whatsapp_opt_in','whatsapp_opt_out','whatsapp_message_delivered','whatsapp_message_read','whatsapp_message_failed'] as const
const actionSchema=z.object({
  action_type:z.enum(['add_tag','remove_tag','wait','internal_log','send_whatsapp','update_contact','start_automation','stop_automation','notify_team']),
  action_config:z.record(z.string(),z.any()).default({}),
})
const bodySchema=z.object({
  name:z.string().trim().min(1).max(120),
  status:z.enum(['draft','active','paused']),
  trigger_type:z.enum(triggerTypes),
  trigger_config:z.record(z.string(),z.any()).default({}),
  actions:z.array(actionSchema).max(30).default([]),
})

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,organization}=await requireWorkspaceRole(['owner','admin','editor'])
  const {id}=await params
  const parsed=bodySchema.safeParse(await req.json().catch(()=>null))
  if(!parsed.success)return NextResponse.json({error:'Automatisation invalide.'},{status:400})
  const b=parsed.data
  const {data,error}=await supabase.from('automations').update({name:b.name,status:b.status,trigger_type:b.trigger_type,trigger_config:b.trigger_config}).eq('id',id).eq('organization_id',organization.id).select('id,name,trigger_type,trigger_config,status,created_at,updated_at').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  const {error:deleteError}=await supabase.from('automation_actions').delete().eq('automation_id',id)
  if(deleteError)return NextResponse.json({error:deleteError.message},{status:400})
  if(b.actions.length){
    const {error:insertError}=await supabase.from('automation_actions').insert(b.actions.map((action,position)=>({automation_id:id,action_type:action.action_type,action_config:action.action_config,position})))
    if(insertError)return NextResponse.json({error:insertError.message},{status:400})
  }
  return NextResponse.json({automation:{...data,actions:b.actions.map((action,position)=>({...action,position}))}})
}

export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,organization}=await requireWorkspaceRole(['owner','admin'])
  const {id}=await params
  const {error}=await supabase.from('automations').delete().eq('id',id).eq('organization_id',organization.id)
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({ok:true})
}
