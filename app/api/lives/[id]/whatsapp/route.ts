import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const {id}=await params
  const {data,error}=await supabase.from('live_events').select('id,title,slug,whatsapp_message_draft').eq('id',id).eq('organization_id',membership.organizationId).maybeSingle()
  if(error)return NextResponse.json({error:error.message},{status:500})
  if(!data)return NextResponse.json({error:'Live introuvable.'},{status:404})
  const {data:participants}=await supabase.from('live_event_participants').select('contact_id,email').eq('live_event_id',id).eq('organization_id',membership.organizationId).neq('status','blocked')
  const ids=(participants||[]).map(p=>p.contact_id)
  const {data:contacts}=ids.length?await supabase.from('contacts').select('id,first_name,last_name,phone,whatsapp_number,consent_status').in('id',ids):{data:[]}
  const eligible=(contacts||[]).filter(c=>Boolean(c.whatsapp_number||c.phone)&&c.consent_status==='opted_in')
  return NextResponse.json({draft:data.whatsapp_message_draft||`Bonjour {{first_name}},\n\nVous êtes invité(e) à notre Live « ${data.title} ».\n\nRejoignez le Live ici : ${process.env.NEXT_PUBLIC_APP_URL||''}/live/${data.slug}\n\nÀ bientôt !`,total_invited:participants?.length||0,whatsapp_eligible:eligible.length})
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor'])
  const {id}=await params
  const body=await request.json().catch(()=>null) as {message?:string}|null
  const message=String(body?.message||'').trim()
  if(!message||message.length>4000)return NextResponse.json({error:'Message invalide.'},{status:400})
  const {data:live}=await supabase.from('live_events').select('id').eq('id',id).eq('organization_id',membership.organizationId).maybeSingle()
  if(!live)return NextResponse.json({error:'Live introuvable.'},{status:404})
  const {error}=await supabase.from('live_events').update({whatsapp_message_draft:message}).eq('id',id).eq('organization_id',membership.organizationId)
  if(error)return NextResponse.json({error:error.message},{status:500})
  const {data:invite}=await supabase.from('live_event_whatsapp_invites').insert({live_event_id:id,organization_id:membership.organizationId,message,status:'ready'}).select('id,status').single()
  if(!invite)return NextResponse.json({ok:true,status:'ready'})
  return NextResponse.json({ok:true,status:invite.status,invite_id:invite.id})
}
