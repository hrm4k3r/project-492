-- Fazenda Santo Antônio — esquema de e-commerce (contas, pedidos, frete, cupons, admin)
-- Rode DEPOIS do schema.sql, no SQL Editor do Supabase.

create extension if not exists pgcrypto;

-- ============================================================
-- PERFIS (estende auth.users do Supabase Auth)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Usuário vê e edita o próprio perfil"
  on profiles for select using (auth.uid() = id);

create policy "Usuário atualiza o próprio perfil"
  on profiles for update using (auth.uid() = id);

create policy "Usuário cria o próprio perfil"
  on profiles for insert with check (auth.uid() = id);

-- Função auxiliar: verifica se o usuário logado é admin (usada em várias policies)
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

-- Cria o perfil automaticamente quando alguém se cadastra
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
-- FRETE (tabela fixa por região — trocável pela API dos Correios depois)
-- ============================================================
create table if not exists freight_rules (
  id uuid primary key default gen_random_uuid(),
  regiao text not null,        -- ex: "Alagoa (retirada local)", "MG", "Sudeste", "Outros estados"
  estados text[] not null default '{}',  -- siglas de UF cobertas por essa regra, vazio = fallback
  preco numeric(10, 2) not null,
  prazo_dias int not null default 7,
  ordem int not null default 0,  -- prioridade de match (menor = checa primeiro)
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table freight_rules enable row level security;

create policy "Frete é público para leitura"
  on freight_rules for select using (ativo = true);

create policy "Admin gerencia o frete"
  on freight_rules for all using (is_admin()) with check (is_admin());

insert into freight_rules (regiao, estados, preco, prazo_dias, ordem) values
  ('Alagoa e região (retirada/entrega local)', array['MG'], 0.00, 1, 1),
  ('Minas Gerais', array['MG'], 25.00, 5, 2),
  ('Sudeste (SP, RJ, ES)', array['SP', 'RJ', 'ES'], 35.00, 7, 3),
  ('Demais estados', array[]::text[], 55.00, 12, 4);

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

-- Ninguém lista cupons publicamente (evita "vazar" códigos); a validação
-- é feita pela função validate_coupon() abaixo, que só devolve o resultado.
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
  desconto numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  coupon_code text,
  payment_provider text default 'pagarme',
  payment_id text,
  payment_status text not null default 'pendente'
    check (payment_status in ('pendente', 'pago', 'falhou', 'reembolsado')),
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

-- ============================================================
-- PRODUTOS: agora com CRUD para admin (a leitura pública já existia)
-- ============================================================
create policy "Admin gerencia produtos"
  on produtos for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Para tornar alguém admin, depois que a pessoa se cadastrar pelo site:
-- update profiles set role = 'admin' where id = 'uuid-do-usuario';
-- (o uuid aparece em Authentication → Users, no painel do Supabase)
-- ============================================================
