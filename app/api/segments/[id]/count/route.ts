import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

type Rule={field:string;operator:string;value:string}
const normalize=(v:unknown)=>String(v??'').trim().toLowerCase()
function matches(value:string,rule:Rule){const a=normalize(value),b=normalize(rule.value);if(rule.operator==='contains')return a.includes(b);if(rule.operator==='not_equals')return a!==b;return a===b}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const {supabase,membership}=await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const {data:segment,error:segmentError}=await supabase.from('contact_segments').select('id,rules,match_mode').eq('id',id).eq('organization_id',membership.organizationId).maybeSingle()
  if(segmentError)return NextResponse.json({error:segmentError.message},{status:500})
  if(!segment)return NextResponse.json({error:'Segment not found.'},{status:404})
  const {data:contacts,error}=await supabase.from('contacts').select('id,status,consent_status,custom_fields').eq('organization_id',membership.organizationId).limit(5000)
  if(error)return NextResponse.json({error:error.message},{status:500})
  const rules=(Array.isArray(segment.rules)?segment.rules:[]) as Rule[]
  if(!rules.length)return NextResponse.json({count:contacts?.length||0})
  const ids=(contacts||[]).filter((c:any)=>{
    const results=rules.map(rule=>{
      if(rule.field==='status')return matches(c.status,rule)
      if(rule.field==='consent_status')return matches(c.consent_status,rule)
      if(rule.field==='source')return matches(c.custom_fields?.source,rule)
      return false
    })
    return segment.match_mode==='any'?results.some(Boolean):results.every(Boolean)
  }).map((c:any)=>c.id)
  if(rules.some(r=>r.field==='tag')){
    const tagRules=rules.filter(r=>r.field==='tag')
    const {data:tagRows,error:tagError}=await supabase.from('contact_tags').select('contact_id,tag_id,tags!inner(name)').in('contact_id',contacts?.map((c:any)=>c.id)||[])
    if(tagError)return NextResponse.json({error:tagError.message},{status:500})
    const tagMap=new Map<string,string[]>();for(const row of tagRows||[]){const arr=tagMap.get(row.contact_id)||[];arr.push((row as any).tags?.name||'');tagMap.set(row.contact_id,arr)}
    const final=(contacts||[]).filter((c:any)=>{const results=rules.map(rule=>rule.field==='tag'?tagRules.some(tr=>tr===rule&&matches((tagMap.get(c.id)||[]).join('|'),tr)): (rule.field==='status'?matches(c.status,rule):rule.field==='consent_status'?matches(c.consent_status,rule):matches(c.custom_fields?.source,rule)));return segment.match_mode==='any'?results.some(Boolean):results.every(Boolean)}).map((c:any)=>c.id)
    return NextResponse.json({count:final.length})
  }
  return NextResponse.json({count:ids.length})
}
