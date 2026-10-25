-- Conik.io: ensure public order references exist and are unguessable.
-- Safe for existing production data: no rows are deleted or rewritten.
create or replace function public.ensure_payment_order_number()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  candidate text;
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    loop
      candidate := 'CNK-' || upper(replace(gen_random_uuid()::text, '-', ''));
      exit when not exists (
        select 1 from public.payment_orders po where po.order_number = candidate
      );
    end loop;
    new.order_number := candidate;
  end if;
  return new;
end;
$function$;

drop trigger if exists payment_orders_ensure_order_number on public.payment_orders;
create trigger payment_orders_ensure_order_number
before insert on public.payment_orders
for each row execute function public.ensure_payment_order_number();

create unique index if not exists payment_orders_order_number_unique
on public.payment_orders (order_number)
where order_number is not null and btrim(order_number) <> '';

comment on function public.ensure_payment_order_number() is
'Assigns a high-entropy, non-sequential public order reference when one is not supplied.';
