-- Integração Bling: campos fiscais adicionais

-- CFOP por produto (opcional; se nulo, o sistema usa 5102/6102 pelo estado do cliente)
alter table produtos
  add column if not exists cfop text;

comment on column produtos.cfop is 'CFOP padrão do produto (ex: 5102). Se nulo, usa 5102 (mesmo estado) ou 6102 (outro estado).';

-- CPF/CNPJ do cliente, necessário para emissão de NF-e
alter table profiles
  add column if not exists documento text;

comment on column profiles.documento is 'CPF (11 dígitos) ou CNPJ (14 dígitos) sem formatação, usado na emissão de NF-e.';
