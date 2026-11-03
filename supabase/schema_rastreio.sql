-- Código de rastreio do pedido (informado no painel ao marcar como "enviado" e enviado no e-mail ao cliente).
-- Rode no SQL Editor do Supabase ANTES de usar o campo no painel. Pode rodar de novo sem problema.

alter table orders add column if not exists codigo_rastreio text;
