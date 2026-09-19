import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier image requis.' }, { status: 400 })
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Format accepté : JPG, PNG, WEBP ou GIF.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La photo doit faire au maximum 5 Mo.' }, { status: 400 })
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('profile-avatars').upload(path, file, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path)
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`

    await supabase.auth.updateUser({
      data: { ...(user.user_metadata || {}), avatar_url: avatarUrl },
    })

    return NextResponse.json({ ok: true, avatarUrl })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Import impossible.' }, { status: 500 })
  }
}
