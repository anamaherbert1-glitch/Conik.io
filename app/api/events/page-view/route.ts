import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
const schema=z.object({funnelId:z.string().uuid(),pageId:z.string().uuid(),visitorId:z.string().min(8).max(100),sessionId:z.string().min(8).max(100),referrer:z.string().max(1000).optional()})
export async function POST(req:NextRequest){try{const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Événement invalide'},{status:400});const supabase=await createClient();const {error}=await supabase.rpc('record_page_view',{target_funnel:parsed.data.funnelId,target_page:parsed.data.pageId,target_visitor:parsed.data.visitorId,target_session:parsed.data.sessionId,target_referrer:parsed.data.referrer||null});if(error)return NextResponse.json({error:'Impossible d’enregistrer l’événement'},{status:400});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Requête invalide'},{status:400})}}
