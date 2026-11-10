// ATENÇÃO: server-only. Nunca importe em componentes client.
import { enviarEmailConfirmacaoPedido, enviarEmailNovoPedidoParaLoja } from "./email";
import { enviarTelegramNovoPedido } from "./telegram";
import { baixarEstoqueEAvisar } from "./estoque";
import { emitirNFe } from "./bling";
import { valorNoPix } from "./pix";

// Marca o pedido como pago e dispara e-mail + NF-e uma única vez.
// O UPDATE condicional faz o papel de trava: quando webhook e polling chegam juntos,
// só quem de fato mudou o status dispara os efeitos. Retorna true se foi quem confirmou.
//
// { pix: true } = o pagamento confirmado foi Pix: o desconto do Pix entra no total (que passa a ser o valor
// realmente pago, usado na NF-e e nos relatórios). Qualquer outro meio zera o desconto do Pix.
export async function confirmarPagamento(db, orderId, { pix = false } = {}) {
  const { data: atual } = await db
    .from("orders")
    .select("total, desconto_pix, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!atual || atual.status === "pago") return false;

  const aplicaPix = pix && Number(atual.desconto_pix ?? 0) > 0;
  const valores = aplicaPix
    ? { total: valorNoPix(atual), desconto_pix: Number(atual.desconto_pix) }
    : { desconto_pix: 0 };

  const { data, error } = await db
    .from("orders")
    .update({ status: "pago", payment_status: "pago", ...valores })
    .eq("id", orderId)
    .neq("status", "pago")
    .select("id");

  if (error) throw error;
  if (!data?.length) return false;

  // Espera terminar antes de responder: na Vercel, trabalho solto após a resposta pode ser
  // encerrado antes de o e-mail sair. Falhas são só registradas e nunca desfazem o pagamento.
  await Promise.all([
    Promise.resolve(enviarEmailConfirmacaoPedido(orderId)).catch(console.error),
    Promise.resolve(enviarEmailNovoPedidoParaLoja(orderId)).catch(console.error),
    Promise.resolve(enviarTelegramNovoPedido(orderId)).catch(console.error),
    baixarEstoqueEAvisar(db, orderId),
    Promise.resolve(emitirNFe(orderId)).catch((err) =>
      console.error(`NF-e pedido ${orderId}:`, err.message)
    ),
  ]);
  return true;
}
