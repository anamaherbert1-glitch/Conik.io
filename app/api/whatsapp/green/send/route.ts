import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { decryptAccessToken } from '@/lib/whatsapp/meta'
import { greenApiInstanceUrl } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'
const text = (v: unknown, max=4000) => typeof v === 'string' && v.trim() ? v.trim().slice(0,max) : ''

export async function POST(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor'])
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const to = text(body.to, 40).replace(/\D/g,'')
  const message = text(body.message, 20000)
  if (!to || to.length < 8 || !message) return NextResponse.json({ error:'Numéro et message valides obligatoires.' }, { status:400 })

  const { data: active, error: subError } = await supabase.rpc('whatsapp_subscription_active', { p_organization_id: membership.organizationId })
  if (subError) return NextResponse.json({ error: subError.message }, { status:500 })
  if (!active) return NextResponse.json({ error:'Abonnement WhatsApp GREEN-API expiré ou absent.', code:'WHATSAPP_SUBSCRIPTION_EXPIRED' }, { status:403 })

  const { data: instance, error } = await supabase.from('whatsapp_green_instances').select('id,id_instance,api_url,api_token_cipher,status').eq('organization_id',membership.organizationId).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error:error.message },{status:500})
  if (!instance) return NextResponse.json({ error:'Aucune instance GREEN-API connectée.' },{status:409})
  if (instance.status !== 'authorized') return NextResponse.json({ error:'WhatsApp GREEN-API n’est pas autorisé.',status:instance.status },{status:409})

  try {
    const response = await fetch(greenApiInstanceUrl(instance.api_url,instance.id_instance,decryptAccessToken(instance.api_token_cipher),'sendMessage'),{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ chatId:`${to}@c.us`, message }), cache:'no-store' })
    const result = await response.json().catch(()=>({})) as Record<string,unknown>
    if (!response.ok || result.code) throw new Error(typeof result.description === 'string' ? result.description : 'GREEN-API a refusé l’envoi.')
    return NextResponse.json({ ok:true, idMessage:result.idMessage ?? null })
  } catch (e) {
    return NextResponse.json({ error:e instanceof Error ? e.message : 'Erreur GREEN-API.' },{status:502})
  }
}
