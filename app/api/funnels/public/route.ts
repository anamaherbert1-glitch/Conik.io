import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime='nodejs'
export async function GET(request:Request){const u=new URL(request.url),f=u.searchParams.get('funnel')||'',p=u.searchParams.get('page')||'home';if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p))return NextResponse.json({error:'Route invalide'},{status:400});const s=await createClient();const{data,error}=await s.rpc('get_published_funnel_page',{target_funnel_slug:f,target_page_slug:p});if(error||!data?.[0])return NextResponse.json({error:'Introuvable'},{status:404});return NextResponse.json({page:data[0]},{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=120'}})}
