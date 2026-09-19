-- ============================================================
-- CONIK — Migration complète (paramètres, feedback, équipe, avatars)
-- À exécuter dans Supabase → SQL Editor → Run
-- Idempotente : peut être relancée sans danger
-- ============================================================

-- 1) Feedback / support
create table if not exists public.support_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  subject text not null,
  message text not null,
  category text not null default 'bug',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.support_feedback enable row level security;

drop policy if exists support_feedback_insert_member on public.support_feedback;
create policy support_feedback_insert_member on public.support_feedback
for insert to authenticated with check (
  organization_id is null or public.is_org_member(organization_id)
);

drop policy if exists support_feedback_select_own on public.support_feedback;
create policy support_feedback_select_own on public.support_feedback
for select to authenticated using (user_id = auth.uid());

grant select, insert on public.support_feedback to authenticated;

-- 2) Invitations d'équipe
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('admin','editor','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.organization_invites enable row level security;

drop policy if exists org_invites_member on public.organization_invites;
create policy org_invites_member on public.organization_invites
for all to authenticated
using (public.is_org_member(organization_id))
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

grant select, insert, update, delete on public.organization_invites to authenticated;

-- 3) Bucket photos de profil
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists profile_avatars_insert_own on storage.objects;
create policy profile_avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists profile_avatars_update_own on storage.objects;
create policy profile_avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists profile_avatars_select_public on storage.objects;
create policy profile_avatars_select_public on storage.objects
for select to public
using (bucket_id = 'profile-avatars');

drop policy if exists profile_avatars_delete_own on storage.objects;
create policy profile_avatars_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

select 'Conik settings migration OK' as status;
