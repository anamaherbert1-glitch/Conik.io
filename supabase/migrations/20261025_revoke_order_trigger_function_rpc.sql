-- Trigger functions are not intended as direct PostgREST RPC endpoints.
revoke all on function public.ensure_payment_order_number() from public, anon, authenticated;
grant execute on function public.ensure_payment_order_number() to service_role;
