-- ============================================================
-- Limpeza ANTES DO LANÇAMENTO (rodar uma vez, no SQL Editor do projeto da LOJA: curadoria-da-mesa)
--
-- Apaga: todos os pedidos (e itens), as vendas do balcão, todos os endereços, TODOS os produtos,
--        o cupom TESTE e todas as contas que NÃO são admin.
-- Mantém: contas admin, categorias, cupons reais (ex.: BEMVINDO), regras de frete,
--         configuracoes e integracoes (tokens do Bling e do Melhor Envio — NÃO apagar).
--
-- PASSO 1: rode só o bloco "PRÉ-VISUALIZAÇÃO" e confira os números e quem é admin.
-- PASSO 2: se estiver tudo certo, rode o bloco "LIMPEZA".
-- ============================================================

-- ---------- PRÉ-VISUALIZAÇÃO (não apaga nada) ----------
select 'admins mantidos' as o_que, count(*) as qtd from profiles where role = 'admin'
union all select 'contas que serão apagadas', count(*) from profiles where role <> 'admin'
union all select 'pedidos que serão apagados', count(*) from orders
union all select 'itens de pedido', count(*) from order_items
union all select 'endereços', count(*) from addresses
union all select 'vendas do balcão', count(*) from vendas_balcao
union all select 'produtos que serão apagados', count(*) from produtos
union all select 'cupons TESTE', count(*) from coupons where upper(code) = 'TESTE'
union all select 'cupons que continuam', count(*) from coupons where upper(code) <> 'TESTE';

select id, full_name, role from profiles order by role, created_at;   -- confira os admins
select code, active from coupons order by code;                        -- confira os cupons
select produto, valor, estoque from produtos order by produto;         -- todos estes serão apagados

-- ---------- LIMPEZA (rode só depois de conferir acima) ----------
begin;

delete from order_items;
delete from orders;
delete from vendas_balcao;   -- os itens saem junto (on delete cascade)
delete from addresses;
delete from produtos;
delete from coupons where upper(code) = 'TESTE';

-- Contas de clientes: apagar do auth remove o perfil junto (on delete cascade).
delete from auth.users
where id in (select id from profiles where role <> 'admin');

commit;

-- Conferência final
select (select count(*) from orders) as pedidos,
       (select count(*) from profiles) as contas_restantes,
       (select count(*) from profiles where role = 'admin') as admins,
       (select count(*) from produtos) as produtos;
