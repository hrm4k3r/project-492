-- Etiqueta do Melhor Envio gerada pelo painel (Admin > Pedidos).
-- etiqueta_id: id do envio no Melhor Envio (gravado ao criar o carrinho, para nunca duplicar/pagar duas vezes).
-- etiqueta_status: carrinho (criado, ainda sem cobrança) | comprando | paga | gerada.
-- Rode uma vez no SQL Editor ANTES de publicar o código que usa. O setup_completo.sql já inclui tudo isto.

alter table orders add column if not exists etiqueta_id text;
alter table orders add column if not exists etiqueta_status text
  check (etiqueta_status is null or etiqueta_status in ('carrinho', 'comprando', 'paga', 'gerada'));
alter table orders add column if not exists etiqueta_erro text;
