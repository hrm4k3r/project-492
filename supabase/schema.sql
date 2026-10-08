-- Fazenda Santo Antônio — schema inicial no Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Dashboard → SQL Editor → New query → colar → Run)

create extension if not exists pgcrypto;

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  produto text not null,
  shortdescription text,
  valor numeric(10, 2) not null,
  imagens text[] not null default '{}',
  avaliacao numeric(2, 1) default 5.0,
  linkpagamento text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Segurança: qualquer pessoa pode LER produtos (é uma vitrine pública),
-- mas ninguém pode escrever sem estar autenticado como admin (isso vem
-- na próxima etapa, junto com o painel administrativo).
alter table produtos enable row level security;

create policy "Produtos são públicos para leitura"
  on produtos for select
  using (ativo = true);

-- Dados de exemplo, com o catálogo real que já existia no site,
-- usando fotos de referência (troque pelas fotos reais quando cadastrar
-- os produtos de novo).
insert into produtos (produto, shortdescription, valor, imagens) values
  ('Mel 400g', 'Apiário Nogueira', 32.00, array['/slider1.jpg']),
  ('Mel Puro Eucalipto', 'Apiário Nogueira', 44.00, array['/slider2.jpg']),
  ('Queijo com Vinho', 'Queijo com Vinho', 63.00, array['/slider1.jpg']),
  ('Queijo com Manjericão', 'Queijo com Manjericão', 63.00, array['/slider3.jpg']),
  ('Queijo Capa Preta', 'Queijo premiado na França em 2023', 65.00, array['/slider1.jpg']),
  ('Queijo Tipo Gouda', 'Queijo Tipo Gouda', 64.00, array['/slider3.jpg']),
  ('Queijo Maturado', 'Queijo Maturado por 1 ano', 85.00, array['/slider1.jpg']),
  ('Queijo de Cabra', 'Queijo de Cabra', 80.00, array['/slider2.jpg']),
  ('Queijo de Búfala', 'Queijo de Búfala', 70.00, array['/slider3.jpg']),
  ('Queijo Defumado', 'Queijo Premiado na França', 63.00, array['/slider1.jpg']);
