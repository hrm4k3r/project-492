// ATENÇÃO: server-only. Nunca importe em componentes client.
import { enviarEmailEstoqueBaixo } from "./email";
import { enviarTelegramEstoqueBaixo } from "./telegram";

// Avisa o lojista por e-mail e por Telegram (cada canal só funciona se estiver configurado).
// Um canal falhar não impede o outro, e nenhum deles lança erro.
export async function avisarEstoqueBaixo(produtos) {
  if (!produtos?.length) return;
  await Promise.allSettled([enviarEmailEstoqueBaixo(produtos), enviarTelegramEstoqueBaixo(produtos)]);
}

// Dá baixa no estoque dos itens de um pedido recém-pago (função SQL baixar_estoque_pedido) e avisa
// o lojista dos produtos que ficaram no mínimo ou abaixo. Falhas só são registradas: o pagamento
// já foi confirmado e não pode ser desfeito por causa do estoque.
export async function baixarEstoqueEAvisar(db, orderId) {
  try {
    const { data, error } = await db.rpc("baixar_estoque_pedido", { p_order_id: orderId });
    if (error) {
      console.error(`Estoque pedido ${orderId}:`, error.message);
      return;
    }
    if (data?.length) await avisarEstoqueBaixo(data);
  } catch (err) {
    console.error(`Estoque pedido ${orderId}:`, err.message);
  }
}
