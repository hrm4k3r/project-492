-- 1) Desconto no Pix: guarda, em cada pedido, quanto o cliente economiza se pagar no Pix.
--    O pedido continua com o total "cheio" (cartão); só quando o pagamento Pix é confirmado o servidor
--    aplica o desconto no total. O percentual fica em Admin > Configurações (configuracoes.desconto_pix_percentual).
-- 2) Cervejas: teor alcoólico (%) e IBU (amargor) para o cadastro, a página do produto e os filtros da loja.
-- Rode uma vez no SQL Editor ANTES de publicar o código que usa. O setup_completo.sql já inclui tudo isto.

alter table orders add column if not exists desconto_pix numeric(10, 2) not null default 0
  check (desconto_pix >= 0);

alter table produtos add column if not exists teor_alcoolico numeric(4, 1)
  check (teor_alcoolico is null or (teor_alcoolico >= 0 and teor_alcoolico <= 100));
alter table produtos add column if not exists ibu integer
  check (ibu is null or (ibu >= 0 and ibu <= 200));
