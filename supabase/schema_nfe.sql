-- Acompanhamento da NF-e emitida pelo Bling em cada pedido.
-- nfe_id:     id da nota no Bling (gravado assim que a nota é criada, para nunca criar duas).
-- nfe_status: situação devolvida pelo Bling depois do envio à Sefaz (NULL = ainda não enviada).
-- nfe_erro:   último erro da emissão, mostrado em Admin > Pedidos (NULL = sem erro).
-- Rode uma vez no SQL Editor. O setup_completo.sql já inclui tudo isto.

alter table orders add column if not exists nfe_id text;
alter table orders add column if not exists nfe_status text;
alter table orders add column if not exists nfe_erro text;
