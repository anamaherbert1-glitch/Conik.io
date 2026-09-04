import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
    const raw = Number(request.nextUrl.searchParams.get('days') || '30')
    const days = [7,30,90].includes(raw) ? raw : 30
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const [{ data: views }, { data: clicks }, { data: submissions }, { data: conversions }] = await Promise.all([
      supabase.from('page_views').select('id,visitor_id,created_at').eq('organization_id', organization.id).gte('created_at', since),
      supabase.from('link_clicks').select('id,created_at').eq('organization_id', organization.id).gte('created_at', since),
      supabase.from('form_submissions').select('id,created_at').eq('organization_id', organization.id).gte('created_at', since),
      supabase.from('conversions').select('id,created_at').eq('organization_id', organization.id).gte('created_at', since),
    ])
    const safeViews=views||[], safeClicks=clicks||[], safeSubs=submissions||[], safeConversions=conversions||[]
    const visitors=new Set(safeViews.map((v:any)=>v.visitor_id).filter(Boolean)).size
    const by:Record<string,{date:string;views:number;clicks:number;submissions:number}>={}
    for(let i=days-1;i>=0;i--){const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);by[d]={date:d,views:0,clicks:0,submissions:0}}
    safeViews.forEach((x:any)=>{const d=x.created_at.slice(0,10);if(by[d])by[d].views++})
    safeClicks.forEach((x:any)=>{const d=x.created_at.slice(0,10);if(by[d])by[d].clicks++})
    safeSubs.forEach((x:any)=>{const d=x.created_at.slice(0,10);if(by[d])by[d].submissions++})
    return NextResponse.json({pageViews:safeViews.length,visitors,clicks:safeClicks.length,submissions:safeSubs.length,leads:safeSubs.length,conversions:safeConversions.length,byDay:Object.values(by)})
  } catch (e:any) { return NextResponse.json({error:e?.message||'Unauthorized'},{status:401}) }
}
