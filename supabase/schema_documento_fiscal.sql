-- Adiciona coluna de documento fiscal (CPF ou CNPJ) ao perfil do cliente
-- Necessário para emissão automática de NF-e via Bling

alter table profiles
  add column if not exists documento text;

comment on column profiles.documento is 'CPF (11 dígitos) ou CNPJ (14 dígitos) sem formatação, usado na emissão de NF-e';
