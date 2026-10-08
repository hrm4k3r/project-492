-- Loja virtual — setup completo do banco (Supabase)
-- Rode este arquivo inteiro UMA vez, num projeto Supabase novo:
-- Dashboard > SQL Editor > New query > colar tudo > Run.
-- Consolida os antigos schema*.sql na ordem certa, sem Pagar.me e sem dados de exemplo.

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
  peso_kg numeric(6, 2) not null default 0.5,
  altura_cm numeric(6, 2) not null default 10,
  largura_cm numeric(6, 2) not null default 15,
  comprimento_cm numeric(6, 2) not null default 15,
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
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Usuário vê o próprio perfil"
  on profiles for select using (auth.uid() = id);

create policy "Usuário atualiza o próprio perfil"
  on profiles for update using (auth.uid() = id);

create policy "Usuário cria o próprio perfil"
  on profiles for insert with check (auth.uid() = id);

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
  created_at timestamptz not null default now()
);

alter table coupons enable row level security;

create policy "Admin gerencia cupons"
  on coupons for all using (is_admin()) with check (is_admin());

create or replace function validate_coupon(coupon_code text, order_subtotal numeric)
returns table (valid boolean, discount_type text, discount_value numeric, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c coupons;
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

  return query select true, c.discount_type, c.discount_value, 'Cupom aplicado!';
end;
$$;

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
  payment_method text check (payment_method in ('pix')),
  payment_details jsonb,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

create policy "Cliente vê os próprios pedidos"
  on orders for select using (auth.uid() = profile_id);

create policy "Cliente cria os próprios pedidos"
  on orders for insert with check (auth.uid() = profile_id);

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

create policy "Cliente cria itens nos próprios pedidos"
  on order_items for insert with check (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.profile_id = auth.uid())
  );

create policy "Admin gerencia todos os itens de pedido"
  on order_items for all using (is_admin()) with check (is_admin());

-- Grava os dados do Pix no próprio pedido sem dar ao cliente UPDATE geral
-- (isso deixaria ele marcar o pedido como "pago" ou mudar o valor).
create or replace function salvar_dados_pagamento(pedido_id uuid, metodo text, detalhes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
    set payment_method = metodo,
        payment_details = detalhes
    where id = pedido_id
      and profile_id = auth.uid()
      and status = 'pendente';
end;
$$;

grant execute on function salvar_dados_pagamento(uuid, text, jsonb) to authenticated;

-- ============================================================
-- INTEGRAÇÕES (tokens do Melhor Envio)
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
  ('frete_gratis_acima', '1000'::jsonb),
  ('primeira_compra_percent', '10'::jsonb)
on conflict (chave) do nothing;

-- Desconto de primeira compra do cliente logado (só se ainda não tem pedidos).
create or replace function desconto_primeira_compra()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select case
    when auth.uid() is not null
      and not exists (
        select 1 from orders where profile_id = auth.uid() and status <> 'cancelado'
      )
    then coalesce((select (valor #>> '{}')::numeric from configuracoes where chave = 'primeira_compra_percent'), 0)
    else 0
  end;
$$;

grant execute on function desconto_primeira_compra() to authenticated;

-- ============================================================
-- STORAGE: bucket de fotos dos produtos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
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
-- DEPOIS DE RODAR: cadastre-se pelo site e torne essa conta admin:
--   update profiles set role = 'admin' where id = '<uuid em Authentication > Users>';
-- ============================================================
