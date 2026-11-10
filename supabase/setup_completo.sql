-- Loja virtual — setup completo do banco (Supabase)
-- Rode este arquivo inteiro UMA vez, num projeto Supabase novo:
-- Dashboard > SQL Editor > New query > colar tudo > Run.
-- Consolida todos os schema*.sql (colunas fiscais, Mercado Pago, categorias, segurança) na ordem certa,
-- sem dados de exemplo. Mantenha este arquivo em dia a cada mudança de banco.

create extension if not exists pgcrypto;

-- ============================================================
-- PRODUTOS
-- ============================================================
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  produto text not null,
  shortdescription text,
  valor numeric(10, 2) not null,
  imagens text[] not null default '{}',
  avaliacao numeric(2, 1) default 5.0,
  linkpagamento text,
  ativo boolean not null default true,
  categoria text,
  pais text,
  marca text,
  estilo text,
  teor_alcoolico numeric(4, 1) check (teor_alcoolico is null or (teor_alcoolico >= 0 and teor_alcoolico <= 100)),
  ibu integer check (ibu is null or (ibu >= 0 and ibu <= 200)),
  peso_kg numeric(6, 2) not null default 0.5,
  altura_cm numeric(6, 2) not null default 10,
  largura_cm numeric(6, 2) not null default 15,
  comprimento_cm numeric(6, 2) not null default 15,
  -- Dados fiscais da NF-e (Bling)
  ncm text,                             -- 8 dígitos, ex.: 22030000 para cervejas
  unidade text not null default 'UN',   -- UN, KG, CX, DZ...
  cfop text,                            -- opcional; vazio usa 5102 (mesmo estado) ou 6102
  -- Estoque: NULL = sem controle. Ao chegar em estoque_minimo (ou menos) o lojista é avisado.
  estoque integer check (estoque is null or estoque >= 0),
  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  created_at timestamptz not null default now()
);

alter table produtos enable row level security;

create index if not exists produtos_categoria_idx on produtos (categoria);

create policy "Produtos são públicos para leitura"
  on produtos for select using (ativo = true);

-- ============================================================
-- PERFIS (estende auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  documento text, -- CPF/CNPJ só com dígitos, gravado pelo servidor (NF-e e cupom de primeira compra)
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Usuário vê o próprio perfil"
  on profiles for select using (auth.uid() = id);

create policy "Usuário atualiza o próprio perfil"
  on profiles for update using (auth.uid() = id);

-- Sem restringir colunas, o cliente poderia fazer update profiles set role = 'admin'.
-- O documento (CPF/CNPJ) é gravado pelo servidor (service_role).
revoke update on profiles from anon, authenticated;
grant update (full_name, phone) on profiles to authenticated;

-- Sem policy de INSERT: o perfil nasce pelo gatilho handle_new_user (abaixo).
revoke insert on profiles from anon, authenticated;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admin vê todos os perfis"
  on profiles for select using (is_admin());

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create policy "Admin gerencia produtos"
  on produtos for all using (is_admin()) with check (is_admin());

-- ============================================================
-- ENDEREÇOS
-- ============================================================
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text default 'Principal',
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;

create policy "Usuário gerencia os próprios endereços"
  on addresses for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Admin vê todos os endereços"
  on addresses for select using (is_admin());

-- ============================================================
-- FRETE (tabela de regras usada como reserva se o Melhor Envio falhar)
-- Ajuste as regras no painel admin (ou aqui) para a região do cliente.
-- ============================================================
create table if not exists freight_rules (
  id uuid primary key default gen_random_uuid(),
  regiao text not null,
  estados text[] not null default '{}',
  preco numeric(10, 2) not null,
  prazo_dias int not null default 7,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table freight_rules enable row level security;

create policy "Frete é público para leitura"
  on freight_rules for select using (ativo = true);

create policy "Admin gerencia o frete"
  on freight_rules for all using (is_admin()) with check (is_admin());

insert into freight_rules (regiao, estados, preco, prazo_dias, ordem) values
  ('Demais estados', array[]::text[], 55.00, 12, 1);

-- ============================================================
-- CUPONS
-- ============================================================
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null,
  min_order_value numeric(10, 2) default 0,
  active boolean not null default true,
  expires_at timestamptz,
  only_first_order boolean not null default false,
  created_at timestamptz not null default now()
);

alter table coupons enable row level security;

create policy "Admin gerencia cupons"
  on coupons for all using (is_admin()) with check (is_admin());

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

-- ============================================================
-- PEDIDOS
-- ============================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  address_id uuid references addresses(id),
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'preparando', 'enviado', 'entregue', 'cancelado')),
  subtotal numeric(10, 2) not null,
  frete numeric(10, 2) not null default 0,
  frete_servico text,
  desconto numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  coupon_code text,
  payment_provider text default 'mercadopago',
  payment_id text,                      -- id do pagamento no Mercado Pago, gravado pelo servidor
  payment_status text not null default 'pendente'
    check (payment_status in ('pendente', 'pago', 'falhou', 'reembolsado')),
  codigo_rastreio text,                 -- informado no painel ao marcar como enviado
  nfe_id text,                          -- id da NF-e no Bling (gravado ao criar a nota)
  nfe_status text,                      -- situação no Bling depois do envio à Sefaz
  nfe_erro text,                        -- último erro da emissão (mostrado em Admin > Pedidos)
  payment_method text check (payment_method in ('pix')),
  desconto_pix numeric(10, 2) not null default 0 check (desconto_pix >= 0), -- desconto do Pix, aplicado ao total quando o Pix é confirmado
  etiqueta_id text,                     -- envio no Melhor Envio (gravado ao criar o carrinho)
  etiqueta_status text check (etiqueta_status is null or etiqueta_status in ('carrinho', 'comprando', 'paga', 'gerada')),
  etiqueta_erro text,
  payment_details jsonb,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

create policy "Cliente vê os próprios pedidos"
  on orders for select using (auth.uid() = profile_id);

-- Sem policy de INSERT para o cliente: pedidos são criados só pelo servidor
-- (POST /api/pedidos/criar, service_role), que recalcula preços, cupom e frete.

create policy "Admin gerencia todos os pedidos"
  on orders for all using (is_admin()) with check (is_admin());

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  produto_id uuid references produtos(id),
  titulo text not null,
  preco_unitario numeric(10, 2) not null,
  quantidade int not null check (quantidade > 0),
  subtotal numeric(10, 2) not null
);

alter table order_items enable row level security;

create policy "Cliente vê itens dos próprios pedidos"
  on order_items for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.profile_id = auth.uid())
  );

create policy "Admin gerencia todos os itens de pedido"
  on order_items for all using (is_admin()) with check (is_admin());

-- Dados do pagamento (payment_id etc.) são gravados só pelo servidor (service_role).

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

-- ============================================================
-- CATEGORIAS DO CATÁLOGO (gerenciadas em Admin > Categorias)
-- ============================================================
create table if not exists categorias (
  id serial primary key,
  slug text unique not null,
  nome text not null,
  descricao text not null default '',
  ordem int not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table categorias enable row level security;

create policy "Leitura pública de categorias ativas"
  on categorias for select using (ativa = true);

create policy "Admin gerencia categorias"
  on categorias for all using (is_admin()) with check (is_admin());

insert into categorias (slug, nome, descricao, ordem) values
  ('cervejas-nacionais', 'Cervejas Artesanais Nacionais', 'Rótulos brasileiros com personalidade, de cervejarias que fazem a diferença.', 1),
  ('cervejas-importadas', 'Cervejas Importadas',          'Clássicos e descobertas de diferentes países e tradições cervejeiras.',       2),
  ('vinhos',             'Vinhos',                        'Vinhos selecionados por origem, uva e perfil.',                               3),
  ('queijos',            'Queijos',                       'Queijos para acompanhar cada rótulo da mesa.',                                4),
  ('cafes',              'Cafés',                         'Cafés especiais, escolhidos pela origem e pelo sabor.',                       5),
  ('doces',              'Doces',                         'Doces artesanais e especiais para adoçar a sua mesa.',                        6)
on conflict (slug) do nothing;

-- ============================================================
-- INTEGRAÇÕES (tokens do Melhor Envio e do Bling)
-- Sem policies de propósito: só a service_role (servidor) acessa.
-- ============================================================
create table if not exists integracoes (
  id text primary key,
  dados jsonb not null,
  updated_at timestamptz not null default now()
);

alter table integracoes enable row level security;

-- ============================================================
-- CONFIGURAÇÕES DA LOJA (editáveis em Admin > Configurações)
-- ============================================================
create table if not exists configuracoes (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

alter table configuracoes enable row level security;

create policy "Configurações são públicas para leitura"
  on configuracoes for select using (true);

create policy "Admin gerencia configurações"
  on configuracoes for all using (is_admin()) with check (is_admin());

insert into configuracoes (chave, valor) values
  ('frete_gratis_acima', '1000'::jsonb)
on conflict (chave) do nothing;


-- ============================================================
-- STORAGE: bucket de fotos dos produtos
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "Fotos de produtos são públicas para leitura"
  on storage.objects for select using (bucket_id = 'produtos');

create policy "Admin faz upload de fotos de produtos"
  on storage.objects for insert with check (bucket_id = 'produtos' and is_admin());

create policy "Admin atualiza fotos de produtos"
  on storage.objects for update using (bucket_id = 'produtos' and is_admin());

create policy "Admin remove fotos de produtos"
  on storage.objects for delete using (bucket_id = 'produtos' and is_admin());

-- ============================================================
-- PDV: vendas presenciais com baixa de estoque
-- ============================================================
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

-- ============================================================
-- DEPOIS DE RODAR: cadastre-se pelo site e torne essa conta admin:
--   update profiles set role = 'admin' where id = '<uuid em Authentication > Users>';
-- ============================================================
