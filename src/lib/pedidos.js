// ATENÇÃO: server-only. Nunca importe em componentes client.
import { enviarEmailConfirmacaoPedido, enviarEmailNovoPedidoParaLoja } from "./email";
import { emitirNFe } from "./bling";

// Marca o pedido como pago e dispara e-mail + NF-e uma única vez.
// O UPDATE condicional faz o papel de trava: quando webhook e polling chegam juntos,
// só quem de fato mudou o status dispara os efeitos. Retorna true se foi quem confirmou.
export async function confirmarPagamento(db, orderId) {
  const { data, error } = await db
    .from("orders")
    .update({ status: "pago", payment_status: "pago" })
    .eq("id", orderId)
    .neq("status", "pago")
    .select("id");

  if (error) throw error;
  if (!data?.length) return false;

  enviarEmailConfirmacaoPedido(orderId).catch(console.error);
  enviarEmailNovoPedidoParaLoja(orderId).catch(console.error);
  emitirNFe(orderId).catch((err) =>
    console.error(`NF-e pedido ${orderId}:`, err.message)
  );
  return true;
}
