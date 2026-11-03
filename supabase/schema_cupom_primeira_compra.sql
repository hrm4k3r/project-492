-- Cupom "só na primeira compra" (ex.: BEMVINDO).
-- Rode no SQL Editor do Supabase.

alter table coupons add column if not exists only_first_order boolean not null default false;

update coupons set only_first_order = true where upper(code) = 'BEMVINDO';

-- Substitui a versão de 2 argumentos. O 3º argumento (customer_id) existe para o servidor,
-- que roda com a service_role e portanto não tem auth.uid(); só a service_role pode informá-lo,
-- para os demais vale sempre auth.uid().
drop function if exists validate_coupon(text, numeric);

create or replace function validate_coupon(coupon_code text, order_subtotal numeric, customer_id uuid default null)
returns table (valid boolean, discount_type text, discount_value numeric, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c coupons;
  uid uuid := coalesce(auth.uid(), case when auth.role() = 'service_role' then customer_id end);
begin
  select * into c from coupons
    where upper(code) = upper(coupon_code) and active = true
    limit 1;

  if c is null then
    return query select false, null::text, null::numeric, 'Cupom não encontrado ou inativo.';
    return;
  end if;

  if c.expires_at is not null and c.expires_at < now() then
    return query select false, null::text, null::numeric, 'Cupom expirado.';
    return;
  end if;

  if order_subtotal < c.min_order_value then
    return query select false, null::text, null::numeric,
      format('Pedido mínimo de R$ %s para usar esse cupom.', c.min_order_value);
    return;
  end if;

  if c.only_first_order then
    if uid is null then
      return query select false, null::text, null::numeric, 'Entre na sua conta para usar este cupom.';
      return;
    end if;

    if exists (
      select 1 from orders
      where profile_id = uid and status in ('pago', 'preparando', 'enviado', 'entregue')
    ) then
      return query select false, null::text, null::numeric, 'Este cupom vale apenas na primeira compra.';
      return;
    end if;
  end if;

  return query select true, c.discount_type, c.discount_value, 'Cupom aplicado!';
end;
$$;

revoke execute on function validate_coupon(text, numeric, uuid) from public;
grant execute on function validate_coupon(text, numeric, uuid) to anon, authenticated, service_role;
