import { createClient } from "@supabase/supabase-js";
import { verificarPagamento } from "@/lib/infinitepay";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// A InfinitePay não assina os webhooks, então validamos cada notificação
// chamando o endpoint /payment_check antes de qualquer alteração no banco.
export async function POST(request) {
  try {
    const payload = await request.json();

    const {
      order_nsu: orderId,
      transaction_nsu: transactionNsu,
      invoice_slug: slug,
      paid_amount: paidAmountCents,
    } = payload;

    if (!orderId) {
      return Response.json({ error: "order_nsu ausente" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Busca o pedido para verificar valor esperado e status atual
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, total, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      // Retorna 200 para evitar retentativas desnecessárias da InfinitePay
      console.warn(`Webhook InfinitePay: pedido ${orderId} não encontrado`);
      return Response.json({ ok: true });
    }

    if (order.status === "pago") {
      // Idempotente — já processado
      return Response.json({ ok: true });
    }

    // Valida o pagamento contra a API InfinitePay
    const check = await verificarPagamento({ orderId, transactionNsu, slug });

    if (!check?.paid) {
      console.warn(`Webhook InfinitePay: pagamento não confirmado para pedido ${orderId}`, check);
      return Response.json({ ok: true });
    }

    // Confere se o valor pago bate com o total do pedido (±1 centavo p/ arredondamento)
    const expectedCents = Math.round(order.total * 100);
    const receivedCents = Number(paidAmountCents ?? check.paid_amount ?? 0);
    if (Math.abs(expectedCents - receivedCents) > 1) {
      console.error(
        `Webhook InfinitePay: valor divergente no pedido ${orderId}. ` +
        `Esperado: ${expectedCents} | Recebido: ${receivedCents}`
      );
      // Não marca como pago; deixa para revisão manual
      return Response.json({ ok: true });
    }

    await db
      .from("orders")
      .update({
        status: "pago",
        payment_status: "pago",
        payment_id: transactionNsu ?? order.payment_id,
      })
      .eq("id", orderId);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook InfinitePay:", err);
    // Retorna 400 para que a InfinitePay tente novamente
    return Response.json({ error: err.message }, { status: 400 });
  }
}
