import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ACCESS_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(request: NextRequest){
  const body=await request.json().catch(()=>null) as {slug?:string;email?:string}|null
  const slug=String(body?.slug||'').trim().toLowerCase(), email=String(body?.email||'').trim().toLowerCase()
  if(!slug||!email||!email.includes('@')) return NextResponse.json({error:'Adresse e-mail invalide.'},{status:400})
  const supabase=await createClient()
  const {data,error}=await supabase.rpc('request_live_access',{p_slug:slug,p_email:email})
  if(error){console.error('live access error',error);return NextResponse.json({error:'Impossible de vérifier l’accès.'},{status:500})}
  const access=data?.[0]
  if(!access)return NextResponse.json({error:'Accès refusé. Cette adresse e-mail n’est pas autorisée pour ce Live.'},{status:403})
  const response=NextResponse.json({live:{id:access.live_id,title:access.title,description:access.description,scheduled_at:access.scheduled_at,timezone:access.timezone,stream_provider:access.stream_provider,stream_id:access.stream_id,chat_enabled:access.chat_enabled !== false}})
  response.cookies.set(`conik_live_${slug}`,access.access_token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:ACCESS_MAX_AGE})
  await supabase.rpc('mark_live_attendance',{p_slug:slug,p_token:access.access_token})
  return response
}

export async function GET(request:NextRequest){
  const slug=String(request.nextUrl.searchParams.get('slug')||'').trim().toLowerCase()
  if(!slug)return NextResponse.json({error:'Live introuvable.'},{status:400})
  const token=request.cookies.get(`conik_live_${slug}`)?.value
  if(!token)return NextResponse.json({authorized:false},{status:401})
  const supabase=await createClient()
  const {data,error}=await supabase.rpc('verify_live_access',{p_slug:slug,p_token:token})
  if(error||!data?.[0])return NextResponse.json({authorized:false},{status:401})
  await supabase.rpc('mark_live_attendance',{p_slug:slug,p_token:token})
  return NextResponse.json({authorized:true,live:{...data[0],chat_enabled:data[0].chat_enabled !== false}})
}
