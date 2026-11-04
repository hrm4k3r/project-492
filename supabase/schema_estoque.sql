-- Controle de estoque com quantidade mínima de alerta.
-- estoque: NULL = produto sem controle de estoque (comportamento antigo, nunca esgota).
-- estoque_minimo: quando o estoque chegar a esse valor (ou menos) o lojista é avisado por e-mail.
-- Rode uma vez no SQL Editor. O setup_completo.sql já inclui tudo isto.

alter table produtos add column if not exists estoque integer check (estoque is null or estoque >= 0);
alter table produtos add column if not exists estoque_minimo integer not null default 0 check (estoque_minimo >= 0);

-- Dá baixa no estoque dos itens de um pedido pago e devolve os produtos que ficaram
-- no mínimo ou abaixo (para o aviso de reposição). Só o servidor (service_role) executa.
create or replace function baixar_estoque_pedido(p_order_id uuid)
returns table (produto_id uuid, produto text, estoque integer, estoque_minimo integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with baixa as (
    update produtos p
       set estoque = greatest(0, p.estoque - i.quantidade)
      from order_items i
     where i.order_id = p_order_id
       and i.produto_id = p.id
       and p.estoque is not null
    returning p.id, p.produto, p.estoque, p.estoque_minimo
  )
  select b.id, b.produto, b.estoque, b.estoque_minimo
    from baixa b
   where b.estoque <= b.estoque_minimo;
end;
$$;

revoke execute on function baixar_estoque_pedido(uuid) from public, anon, authenticated;
grant execute on function baixar_estoque_pedido(uuid) to service_role;
