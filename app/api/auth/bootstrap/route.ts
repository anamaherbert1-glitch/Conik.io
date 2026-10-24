import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/**
 * Crée profil + organisation si absents.
 * Utilise le client admin pour éviter les blocages RLS côté client.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Déjà membre d’un espace ?
    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membership?.organization_id) {
      return NextResponse.json({ ok: true, organizationId: membership.organization_id, existing: true })
    }

    const meta = user.user_metadata || {}
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() ||
      (user.email || '').split('@')[0] ||
      'Utilisateur'

    // Profil
    const { error: profileError } = await admin.from('profiles').upsert({
      id: user.id,
      full_name: fullName.slice(0, 120),
      phone: typeof meta.phone === 'string' ? meta.phone : null,
      country: typeof meta.country === 'string' ? meta.country : null,
      city: typeof meta.city === 'string' ? meta.city : null,
      company: typeof meta.company === 'string' ? meta.company : null,
      updated_at: new Date().toISOString(),
    })
    if (profileError) {
      console.error('bootstrap profile', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Slug unique
    const base =
      slugify(
        (typeof meta.company === 'string' && meta.company) ||
          fullName ||
          (user.email || '').split('@')[0] ||
          'espace',
      ) || 'espace'

    let orgSlug = base
    for (let i = 0; i < 8; i++) {
      const candidate = i === 0 ? orgSlug : `${base}-${i + 1}`
      const { data: clash } = await admin
        .from('organizations')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (!clash) {
        orgSlug = candidate
        break
      }
      if (i === 7) orgSlug = `${base}-${Date.now().toString(36)}`
    }

    const orgName = fullName.slice(0, 120) || 'Mon espace'

    // Prefer RPC if available (handles membership + defaults)
    const { data: rpcOrg, error: rpcError } = await admin.rpc('create_organization', {
      org_name: orgName,
      org_slug: orgSlug,
    })

    if (!rpcError) {
      // RPC may not bind to current user when called as service role — ensure membership
      const { data: after } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (after?.organization_id) {
        return NextResponse.json({ ok: true, organizationId: after.organization_id, via: 'rpc' })
      }

      // Service-role RPC sometimes creates org without membership for JWT user
      if (rpcOrg) {
        const orgId = typeof rpcOrg === 'string' ? rpcOrg : (rpcOrg as { id?: string })?.id
        if (orgId) {
          await admin.from('organization_members').upsert({
            organization_id: orgId,
            user_id: user.id,
            role: 'owner',
          }, { onConflict: 'organization_id,user_id' })
          return NextResponse.json({ ok: true, organizationId: orgId, via: 'rpc+member' })
        }
      }
    }

    // Fallback manuel
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
      })
      .select('id')
      .single()

    if (orgError) {
      // Race: already created
      const { data: again } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (again?.organization_id) {
        return NextResponse.json({ ok: true, organizationId: again.organization_id, existing: true })
      }
      console.error('bootstrap org', orgError, rpcError)
      return NextResponse.json({
        error: orgError.message || rpcError?.message || 'Création de l’espace impossible.',
      }, { status: 400 })
    }

    const { error: memberError } = await admin.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      console.error('bootstrap member', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, organizationId: org.id, via: 'insert' })
  } catch (e) {
    console.error('bootstrap', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bootstrap impossible.' },
      { status: 500 },
    )
  }
}
