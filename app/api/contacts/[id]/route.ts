import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):null

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor','viewer']); const {id}=await params
  const {data,error}=await supabase.from('contacts').select('id,email,phone,whatsapp_number,first_name,last_name,status,consent_status,custom_fields,last_activity_at,created_at,updated_at').eq('id',id).eq('organization_id',membership.organizationId).maybeSingle()
  if(error)return NextResponse.json({error:error.message},{status:500}); if(!data)return NextResponse.json({error:'Contact introuvable.'},{status:404})
  const [{data:activity},{data:tagLinks}]=await Promise.all([supabase.from('contact_activity').select('id,type,metadata,created_at').eq('contact_id',id).eq('organization_id',membership.organizationId).order('created_at',{ascending:false}).limit(100),supabase.from('contact_tags').select('tag_id,tags(id,name,color)').eq('contact_id',id)])
  return NextResponse.json({contact:{...data,source:data.custom_fields?.source||'manual',consent_marketing:data.consent_status==='opted_in'},activity:activity||[],tags:(tagLinks||[]).map((x:any)=>x.tags).filter(Boolean)})
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor']); const {id}=await params; const body=await request.json().catch(()=>null)
  if(!body||typeof body!=='object')return NextResponse.json({error:'Contact invalide.'},{status:400})
  const email=text(body.email,320)?.toLowerCase()||null; const phone=text(body.phone,40)
  if(!email&&!phone)return NextResponse.json({error:'L’e-mail ou le téléphone est obligatoire.'},{status:400})
  if(email&&!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Adresse e-mail invalide.'},{status:400})
  const {data:dup}=await supabase.from('contacts').select('id').eq('organization_id',membership.organizationId).neq('id',id).or([email?`email.eq.${email}`:'',phone?`phone.eq.${phone}`:''].filter(Boolean).join(',')).limit(1).maybeSingle()
  if(dup)return NextResponse.json({error:'Un autre contact utilise déjà cet e-mail ou ce téléphone.'},{status:409})
  const {data:old}=await supabase.from('contacts').select('custom_fields').eq('id',id).eq('organization_id',membership.organizationId).maybeSingle(); if(!old)return NextResponse.json({error:'Contact introuvable.'},{status:404})
  const custom={...(old.custom_fields||{}),source:text(body.source,160)||old.custom_fields?.source||'manual'}
  const {data,error}=await supabase.from('contacts').update({email,phone,first_name:text(body.first_name,120),last_name:text(body.last_name,120),status:text(body.status,40)||'lead',consent_status:body.consent_marketing===true?'opted_in':body.consent_marketing===false?'opted_out':undefined,custom_fields:custom,last_activity_at:new Date().toISOString()}).eq('id',id).eq('organization_id',membership.organizationId).select('*').single()
  if(error)return NextResponse.json({error:error.message},{status:400}); await supabase.from('contact_activity').insert({contact_id:id,organization_id:membership.organizationId,type:'contact_updated',metadata:{source:'crm'}})
  return NextResponse.json({contact:data})
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin']); const {id}=await params
  const {error}=await supabase.from('contacts').delete().eq('id',id).eq('organization_id',membership.organizationId)
  if(error)return NextResponse.json({error:error.message},{status:400}); return NextResponse.json({ok:true})
}
