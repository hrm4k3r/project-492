-- Fazenda Santo Antônio — peso e dimensões dos produtos (para calcular frete real)
-- Rode no SQL Editor do Supabase.

alter table produtos add column if not exists peso_kg numeric(6, 2) not null default 0.5;
alter table produtos add column if not exists altura_cm numeric(6, 2) not null default 10;
alter table produtos add column if not exists largura_cm numeric(6, 2) not null default 15;
alter table produtos add column if not exists comprimento_cm numeric(6, 2) not null default 15;

-- Os valores padrão acima são um chute razoável para uma peça de queijo
-- embalada. Ajuste produto a produto no painel admin quando puder pesar
-- e medir as embalagens reais — isso afeta direto o preço do frete.

alter table orders add column if not exists frete_servico text;
