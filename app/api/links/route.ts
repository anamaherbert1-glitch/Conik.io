import {NextResponse} from 'next/server'
import {requireWorkspaceRole} from '@/lib/auth/require-user'

export async function GET(){const{supabase,organization}=await requireWorkspaceRole(['owner','admin','editor','viewer']);const{data,error}=await supabase.from('links').select('id,slug,destination_url,funnel_id,created_at,link_clicks(count)').eq('organization_id',organization.id).order('created_at',{ascending:false});if(error)return NextResponse.json({error:error.message},{status:500});const links=(data||[]).map((l:any)=>({id:l.id,slug:l.slug,destination_url:l.destination_url,funnel_id:l.funnel_id,created_at:l.created_at,clicks:l.link_clicks?.[0]?.count??0}));return NextResponse.json({links})}

export async function POST(req:Request){
  const{supabase,organization}=await requireWorkspaceRole(['owner','admin','editor'])
  const b=await req.json().catch(()=>null)
  const destination=typeof b?.destination_url==='string'?b.destination_url.trim():''
  let slug=typeof b?.slug==='string'?b.slug.trim().toLowerCase():''
  const funnelId=typeof b?.funnel_id==='string'&&/^[0-9a-f-]{36}$/i.test(b.funnel_id)?b.funnel_id:null
  if(!/^https?:\/\//i.test(destination))return NextResponse.json({error:'La destination doit être une URL http ou https.'},{status:400})
  if(funnelId){const{data:funnel}=await supabase.from('funnels').select('id').eq('id',funnelId).eq('organization_id',organization.id).maybeSingle();if(!funnel)return NextResponse.json({error:'Tunnel invalide.'},{status:400})}
  if(!slug)slug=Math.random().toString(36).slice(2,9)
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return NextResponse.json({error:'Identifiant (slug) invalide.'},{status:400})
  const{data,error}=await supabase.from('links').insert({organization_id:organization.id,funnel_id:funnelId,slug,destination_url:destination}).select('id,slug,destination_url,funnel_id,created_at').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({link:data},{status:201})
}
