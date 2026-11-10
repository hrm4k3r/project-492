-- Datas de postagem e de entrega do pedido, preenchidas pela sincronização com o Melhor Envio
-- (Admin > Pedidos > Atualizar entregas e verificação diária). Aparecem em Minha conta.
-- Rode uma vez no SQL Editor ANTES de usar. O setup_completo.sql já inclui tudo isto.

alter table orders add column if not exists enviado_em timestamptz;
alter table orders add column if not exists entregue_em timestamptz;
