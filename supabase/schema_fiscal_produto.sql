-- Adiciona campos fiscais à tabela de produtos para emissão de NF-e via Bling

alter table produtos
  add column if not exists ncm text,
  add column if not exists unidade text not null default 'UN';

comment on column produtos.ncm     is 'Código NCM (8 dígitos), ex: 22030000 para cervejas';
comment on column produtos.unidade is 'Unidade de medida para NF-e: UN, KG, CX, DZ, etc.';
