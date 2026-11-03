-- Pedidos passam a ser criados só pelo servidor (POST /api/pedidos/criar, service_role),
-- que recalcula preços, cupom e frete. Antes, o cliente podia inserir em orders/order_items
-- direto pelo Supabase com qualquer total (ou até status = 'pago').
-- Rode no SQL Editor do Supabase.
drop policy if exists "Cliente cria os próprios pedidos" on orders;
drop policy if exists "Cliente cria itens nos próprios pedidos" on order_items;
