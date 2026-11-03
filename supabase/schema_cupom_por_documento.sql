-- Cupom "só na primeira compra" (BEMVINDO) passa a valer por CPF/CNPJ, não só por conta:
-- quem já comprou com o mesmo documento em outra conta também não usa de novo.
-- Rode no SQL Editor do Supabase. Mesma assinatura da versão anterior: pode rodar a qualquer hora.

create or replace function validate_coupon(coupon_code text, order_subtotal numeric, customer_id uuid default null)
returns table (valid boolean, discount_type text, discount_value numeric, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c coupons;
  uid uuid := coalesce(auth.uid(), case when auth.role() = 'service_role' then customer_id end);
  doc text;
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

    select nullif(regexp_replace(coalesce(documento, ''), '\D', '', 'g'), '')
      into doc from profiles where id = uid;

    -- Compra anterior da conta OU de qualquer conta com o mesmo CPF/CNPJ.
    if exists (
      select 1
        from orders o
        join profiles p on p.id = o.profile_id
       where o.status in ('pago', 'preparando', 'enviado', 'entregue')
         and (
           o.profile_id = uid
           or (doc is not null and regexp_replace(coalesce(p.documento, ''), '\D', '', 'g') = doc)
         )
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
