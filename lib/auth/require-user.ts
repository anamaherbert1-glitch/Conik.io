import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = [
  'owner',
  'admin',
  'editor',
  'viewer',
] as const

export function canManageWorkspace(role: WorkspaceRole) {
  return role === 'owner' || role === 'admin'
}

export function canEditWorkspace(role: WorkspaceRole) {
  return canManageWorkspace(role) || role === 'editor'
}

export async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) redirect('/login')

  return { supabase, user: data.user }
}

export async function requireWorkspace() {
  const { supabase, user } = await requireUser()

  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, logo_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Unable to load workspace: ${error.message}`)

  if (!membership) redirect('/onboarding')

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  if (!organization) throw new Error('Workspace is unavailable')

  return {
    supabase,
    user,
    membership: {
      organizationId: membership.organization_id,
      role: membership.role as WorkspaceRole,
    },
    organization,
  }
}

export async function requireWorkspaceRole(allowedRoles: readonly WorkspaceRole[]) {
  const workspace = await requireWorkspace()

  if (!allowedRoles.includes(workspace.membership.role)) {
    redirect('/dashboard?error=forbidden')
  }

  return workspace
}
