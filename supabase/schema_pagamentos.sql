-- Fazenda Santo Antônio — suporte a pagamentos (Pagar.me)
-- Rode DEPOIS do schema_ecommerce.sql, no SQL Editor do Supabase.

alter table profiles add column if not exists cpf text;

alter table orders add column if not exists payment_method text
  check (payment_method in ('pix', 'boleto', 'credit_card'));
alter table orders add column if not exists payment_details jsonb;
