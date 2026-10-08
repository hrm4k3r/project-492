-- Fazenda Santo Antônio — permite ao cliente salvar os dados do Pix
-- gerado no próprio pedido, sem abrir uma brecha de segurança (não é
-- uma policy de UPDATE genérica — isso deixaria o cliente alterar
-- status/valor do próprio pedido, inclusive marcar como "pago" sem
-- pagar). Em vez disso, uma função estreita: só grava payment_method
-- e payment_details, só no próprio pedido, só enquanto ele ainda
-- estiver "pendente".

create or replace function salvar_dados_pagamento(pedido_id uuid, metodo text, detalhes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
    set payment_method = metodo,
        payment_details = detalhes
    where id = pedido_id
      and profile_id = auth.uid()
      and status = 'pendente';
end;
$$;

grant execute on function salvar_dados_pagamento(uuid, text, jsonb) to authenticated;
