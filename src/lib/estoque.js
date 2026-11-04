// ATENÇÃO: server-only. Nunca importe em componentes client.
import { enviarEmailEstoqueBaixo } from "./email";

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
    if (data?.length) await enviarEmailEstoqueBaixo(data);
  } catch (err) {
    console.error(`Estoque pedido ${orderId}:`, err.message);
  }
}
