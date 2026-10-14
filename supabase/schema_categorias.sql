-- Categorias do catálogo, gerenciadas pelo painel admin.
-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists categorias (
  id        serial       primary key,
  slug      text         unique not null,
  nome      text         not null,
  descricao text         not null default '',
  ordem     int          not null default 0,
  ativa     boolean      not null default true,
  created_at timestamptz not null default now()
);

alter table categorias enable row level security;

-- Qualquer visitante lê categorias ativas
create policy "Leitura pública de categorias ativas" on categorias
  for select using (ativa = true);

-- Admin lê todas (inclusive inativas)
create policy "Admin vê todas as categorias" on categorias
  for select to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Admin cria, edita e exclui
create policy "Admin insere categorias" on categorias
  for insert to authenticated
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admin atualiza categorias" on categorias
  for update to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admin exclui categorias" on categorias
  for delete to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Dados iniciais (idempotente)
insert into categorias (slug, nome, descricao, ordem) values
  ('cervejas-nacionais', 'Cervejas Artesanais Nacionais', 'Rótulos brasileiros com personalidade, de cervejarias que fazem a diferença.', 1),
  ('cervejas-importadas', 'Cervejas Importadas',          'Clássicos e descobertas de diferentes países e tradições cervejeiras.',       2),
  ('vinhos',             'Vinhos',                        'Vinhos selecionados por origem, uva e perfil.',                               3),
  ('queijos',            'Queijos',                       'Queijos para acompanhar cada rótulo da mesa.',                                4),
  ('cafes',              'Cafés',                         'Cafés especiais, escolhidos pela origem e pelo sabor.',                       5),
  ('doces',              'Doces',                         'Doces artesanais e especiais para adoçar a sua mesa.',                        6)
on conflict (slug) do nothing;
