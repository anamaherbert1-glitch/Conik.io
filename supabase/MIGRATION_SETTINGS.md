# Migration Paramètres / Support / Équipe / Photos

## Étapes (Supabase)

1. Ouvrez votre projet **Supabase** → **SQL Editor**
2. Copiez le contenu du fichier :
   `supabase/migrations/20260919210000_conik_all_settings_features.sql`
3. Collez dans l’éditeur SQL → **Run**
4. Vérifiez le message `Conik settings migration OK`

## Ce que ça active

- Table `support_feedback` (messages support)
- Table `organization_invites` (invitations collaborateur)
- Bucket Storage `profile-avatars` (photos de profil depuis le téléphone)

Sans cette migration, l’import de photo peut échouer et les invitations / feedback peuvent être incomplets.
