import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema=z.object({name:z.string().trim().min(1).max(120),status:z.enum(['draft','active','paused']),funnel_id:z.string().uuid().nullable()})

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const {supabase,organization}=await requireWorkspaceRole(['owner','admin','editor']);const{id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Données de campagne invalides.'},{status:400});if(parsed.data.funnel_id){const{data:f}=await supabase.from('funnels').select('id').eq('id',parsed.data.funnel_id).eq('organization_id',organization.id).maybeSingle();if(!f)return NextResponse.json({error:'Tunnel invalide.'},{status:400})}const{data,error}=await supabase.from('campaigns').update(parsed.data).eq('id',id).eq('organization_id',organization.id).select('id,name,status,funnel_id,created_at,updated_at').single();if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({campaign:data})}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){const{supabase,organization}=await requireWorkspaceRole(['owner','admin']);const{id}=await params;const{error}=await supabase.from('campaigns').delete().eq('id',id).eq('organization_id',organization.id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true})}
