import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
const schema=z.object({funnelId:z.string().uuid(),pageId:z.string().uuid(),visitorId:z.string().min(8).max(100),sessionId:z.string().min(8).max(100),referrer:z.string().max(1000).optional()})
export async function POST(req:NextRequest){try{const body=await req.json();const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Invalid event'},{status:400});const supabase=await createClient();const {error}=await supabase.from('page_views').insert(parsed.data);if(error)return NextResponse.json({error:'Unable to record event'},{status:400});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Invalid request'},{status:400})}}
