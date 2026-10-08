-- Curadoria da Mesa — categorias/filtros de produto + configurações da loja
-- Para bancos que JÁ rodaram o setup_completo.sql antigo.
-- Pode rodar mais de uma vez sem problema.
-- Dashboard > SQL Editor > New query > colar tudo > Run.

-- Categoria e atributos usados nos filtros do catálogo
alter table produtos add column if not exists categoria text;
alter table produtos add column if not exists pais text;
alter table produtos add column if not exists marca text;
alter table produtos add column if not exists estilo text;
create index if not exists produtos_categoria_idx on produtos (categoria);

-- Configurações editáveis pelo admin (frete grátis, desconto de primeira compra)
create table if not exists configuracoes (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

alter table configuracoes enable row level security;

drop policy if exists "Configurações são públicas para leitura" on configuracoes;
create policy "Configurações são públicas para leitura"
  on configuracoes for select using (true);

drop policy if exists "Admin gerencia configurações" on configuracoes;
create policy "Admin gerencia configurações"
  on configuracoes for all using (is_admin()) with check (is_admin());

insert into configuracoes (chave, valor) values
  ('frete_gratis_acima', '1000'::jsonb),
  ('primeira_compra_percent', '10'::jsonb)
on conflict (chave) do nothing;

-- Percentual de desconto de primeira compra para o cliente logado:
-- só vale se ele ainda não tem nenhum pedido (cancelados não contam).
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
