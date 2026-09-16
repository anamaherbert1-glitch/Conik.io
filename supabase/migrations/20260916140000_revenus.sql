-- Revenus : s’appuie sur payment_orders + page_views + conversions
-- Indexes pour filtres par période (dashboard Revenus)

create index if not exists idx_payment_orders_org_created
  on public.payment_orders (organization_id, created_at desc);

create index if not exists idx_payment_orders_org_paid
  on public.payment_orders (organization_id, paid_at desc)
  where status = 'paid';

create index if not exists idx_payment_orders_status
  on public.payment_orders (organization_id, status);

-- Vues page (visites) si pas déjà indexées
do $$ begin
  create index if not exists idx_page_views_funnel_created
    on public.page_views (funnel_id, created_at desc);
exception when undefined_table then null;
end $$;

do $$ begin
  create index if not exists idx_conversions_org_created
    on public.conversions (organization_id, created_at desc);
exception when undefined_table then null;
end $$;

-- Colonne utile pour lier une commande à un tarif / produit affiché
do $$ begin
  alter table public.payment_orders add column if not exists product_label text;
exception when undefined_table then null;
end $$;
