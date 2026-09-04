import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):null
const allowedFields=['status','consent_status','source','tag'] as const

type Rule={field:string;operator:string;value:string}
function validRules(value:unknown):Rule[]{
  if(!Array.isArray(value))return []
  return value.slice(0,10).filter((r:any)=>r&&typeof r==='object'&&allowedFields.includes(r.field)&&['equals','contains','not_equals'].includes(r.operator)&&typeof r.value==='string'&&r.value.trim()).map((r:any)=>({field:r.field,operator:r.operator,value:r.value.trim().slice(0,160)}))
}

export async function GET(){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const {data,error}=await supabase.from('contact_segments').select('id,name,description,rules,match_mode,created_at,updated_at').eq('organization_id',membership.organizationId).order('created_at',{ascending:false})
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({segments:data||[]})
}

export async function POST(request:Request){
  const {supabase,user,membership}=await requireWorkspaceRole(['owner','admin','editor'])
  const body=await request.json().catch(()=>null)
  if(!body||typeof body!=='object')return NextResponse.json({error:'Segment invalide.'},{status:400})
  const name=text(body.name,120);if(!name)return NextResponse.json({error:'Le nom du segment est obligatoire.'},{status:400})
  const rules=validRules(body.rules);const matchMode=body.match_mode==='any'?'any':'all'
  const {data,error}=await supabase.from('contact_segments').insert({organization_id:membership.organizationId,name,description:text(body.description,500),rules,match_mode:matchMode,created_by:user.id}).select('id,name,description,rules,match_mode,created_at,updated_at').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({segment:data},{status:201})
}

export async function PATCH(request:Request){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor'])
  const body=await request.json().catch(()=>null);if(!body||typeof body!=='object'||typeof body.id!=='string')return NextResponse.json({error:'L’identifiant du segment est obligatoire.'},{status:400})
  const rules=validRules(body.rules);const name=text(body.name,120);if(!name)return NextResponse.json({error:'Le nom du segment est obligatoire.'},{status:400})
  const {data,error}=await supabase.from('contact_segments').update({name,description:text(body.description,500),rules,match_mode:body.match_mode==='any'?'any':'all',updated_at:new Date().toISOString()}).eq('id',body.id).eq('organization_id',membership.organizationId).select('id,name,description,rules,match_mode,created_at,updated_at').maybeSingle()
  if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:'Segment introuvable.'},{status:404})
  return NextResponse.json({segment:data})
}

export async function DELETE(request:Request){
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin'])
  const body=await request.json().catch(()=>null);if(!body||typeof body.id!=='string')return NextResponse.json({error:'L’identifiant du segment est obligatoire.'},{status:400})
  const {error}=await supabase.from('contact_segments').delete().eq('id',body.id).eq('organization_id',membership.organizationId)
  if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true})
}
