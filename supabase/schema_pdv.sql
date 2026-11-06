-- PDV (vendas presenciais na loja): registra a venda e dá baixa no estoque na mesma transação,
-- para o produto vendido no balcão sair do site na hora. Rode uma vez no SQL Editor.
-- O setup_completo.sql já inclui tudo isto. Rode ANTES de publicar o código que usa.

create table if not exists vendas_balcao (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  forma_pagamento text not null check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito')),
  cliente text,
  subtotal numeric(10, 2) not null,
  desconto numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  observacao text,
  status text not null default 'concluida' check (status in ('concluida', 'cancelada')),
  operador uuid references profiles(id) on delete set null
);

create table if not exists vendas_balcao_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas_balcao(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  titulo text not null,
  preco_unitario numeric(10, 2) not null,
  quantidade integer not null check (quantidade > 0),
  subtotal numeric(10, 2) not null
);

create index if not exists vendas_balcao_created_idx on vendas_balcao (created_at desc);
create index if not exists vendas_balcao_itens_venda_idx on vendas_balcao_itens (venda_id);

alter table vendas_balcao enable row level security;
alter table vendas_balcao_itens enable row level security;

drop policy if exists "Admin vê as vendas do balcão" on vendas_balcao;
create policy "Admin vê as vendas do balcão"
  on vendas_balcao for select using (is_admin());

drop policy if exists "Admin vê os itens do balcão" on vendas_balcao_itens;
create policy "Admin vê os itens do balcão"
  on vendas_balcao_itens for select using (is_admin());
-- Sem INSERT/UPDATE/DELETE para o navegador: só as funções abaixo (service_role) gravam.

-- Registra a venda: recalcula o preço no banco (nunca confia no navegador), recusa quantidade
-- acima do estoque e dá a baixa. Devolve {venda_id, total, baixos:[produtos no mínimo ou abaixo]}.
create or replace function registrar_venda_balcao(
  p_operador uuid,
  p_itens jsonb,
  p_forma text,
  p_cliente text,
  p_desconto numeric,
  p_observacao text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venda uuid;
  v_subtotal numeric(10, 2) := 0;
  v_desconto numeric(10, 2);
  v_item record;
  v_prod record;
  v_baixos jsonb := '[]'::jsonb;
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione pelo menos um produto à venda.';
  end if;
  if p_forma not in ('dinheiro', 'pix', 'debito', 'credito') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  insert into vendas_balcao (forma_pagamento, cliente, subtotal, total, observacao, operador)
  values (p_forma, nullif(trim(coalesce(p_cliente, '')), ''), 0, 0, nullif(trim(coalesce(p_observacao, '')), ''), p_operador)
  returning id into v_venda;

  -- Linhas repetidas do mesmo produto viram uma só (soma as quantidades).
  for v_item in
    select (x->>'produto_id')::uuid as produto_id, sum((x->>'quantidade')::int) as quantidade
      from jsonb_array_elements(p_itens) x
     group by 1
     order by 1
  loop
    if v_item.quantidade is null or v_item.quantidade <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select id, produto, valor, estoque, estoque_minimo
      into v_prod
      from produtos
     where id = v_item.produto_id
     for update;

    if not found then
      raise exception 'Produto não encontrado.';
    end if;
    if v_prod.estoque is not null and v_prod.estoque < v_item.quantidade then
      raise exception 'Estoque insuficiente de "%": restam %.', v_prod.produto, v_prod.estoque;
    end if;

    insert into vendas_balcao_itens (venda_id, produto_id, titulo, preco_unitario, quantidade, subtotal)
    values (v_venda, v_prod.id, v_prod.produto, v_prod.valor, v_item.quantidade, round(v_prod.valor * v_item.quantidade, 2));

    v_subtotal := v_subtotal + round(v_prod.valor * v_item.quantidade, 2);

    if v_prod.estoque is not null then
      update produtos set estoque = estoque - v_item.quantidade where id = v_prod.id;
      if v_prod.estoque - v_item.quantidade <= v_prod.estoque_minimo then
        v_baixos := v_baixos || jsonb_build_object(
          'produto_id', v_prod.id,
          'produto', v_prod.produto,
          'estoque', v_prod.estoque - v_item.quantidade,
          'estoque_minimo', v_prod.estoque_minimo
        );
      end if;
    end if;
  end loop;

  v_desconto := least(greatest(coalesce(p_desconto, 0), 0), v_subtotal);
  update vendas_balcao
     set subtotal = v_subtotal, desconto = v_desconto, total = v_subtotal - v_desconto
   where id = v_venda;

  return jsonb_build_object('venda_id', v_venda, 'total', v_subtotal - v_desconto, 'baixos', v_baixos);
end;
$$;

-- Cancela a venda e devolve os produtos ao estoque (só os que têm controle de estoque).
create or replace function cancelar_venda_balcao(p_venda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from vendas_balcao where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;
  if v_status = 'cancelada' then
    raise exception 'Esta venda já foi cancelada.';
  end if;

  update vendas_balcao set status = 'cancelada' where id = p_venda_id;

  update produtos p
     set estoque = p.estoque + i.quantidade
    from vendas_balcao_itens i
   where i.venda_id = p_venda_id
     and i.produto_id = p.id
     and p.estoque is not null;
end;
$$;

revoke execute on function registrar_venda_balcao(uuid, jsonb, text, text, numeric, text) from public, anon, authenticated;
grant execute on function registrar_venda_balcao(uuid, jsonb, text, text, numeric, text) to service_role;
revoke execute on function cancelar_venda_balcao(uuid) from public, anon, authenticated;
grant execute on function cancelar_venda_balcao(uuid) to service_role;
