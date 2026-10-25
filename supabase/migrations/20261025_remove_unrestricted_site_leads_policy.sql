-- Remove a legacy permissive policy that allowed any values to be inserted into site_leads.
-- The validated policy "public can submit website leads" remains active.
drop policy if exists "public can insert site leads" on public.site_leads;
