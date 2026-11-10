import { createClient } from "@supabase/supabase-js";
import { buscarPagamento } from "@/lib/mercadopago";
import { confirmarPagamento } from "@/lib/pedidos";
import { centavosEsperados } from "@/lib/pix";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Verifica o status do pagamento diretamente no MP e atualiza o pedido se aprovado.
// Usado pelo polling da página de pagamento — não depende do webhook chegar.
export async function POST(request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) return Response.json({ status: "erro" }, { status: 400 });

    const db = supabaseAdmin();

    const { data: order } = await db
      .from("orders")
      .select("status, total, desconto_pix, payment_id")
      .eq("id", orderId)
      .single();

    if (!order) return Response.json({ status: "not_found" }, { status: 404 });

    // Já confirmado no banco
    if (order.status === "pago") return Response.json({ status: "pago" });

    // Só consulta o pagamento que o servidor registrou neste pedido: um id vindo
    // do cliente permitiria "quitar" um pedido com o pagamento de outro.
    const mpPaymentId = order.payment_id;
    if (!mpPaymentId) return Response.json({ status: order.status });

    // Consulta o MP diretamente
    const payment = await buscarPagamento(String(mpPaymentId));

    if (payment.status === "approved") {
      const esperado = centavosEsperados(order, payment);
      const pago = Math.round(Number(payment.transaction_amount) * 100);
      if (payment.external_reference !== orderId || Math.abs(esperado - pago) > 1) {
        console.error(`verificar: pagamento ${mpPaymentId} não confere com o pedido ${orderId}`);
        return Response.json({ status: "pendente", mpStatus: payment.status });
      }

      await confirmarPagamento(db, orderId, { pix: payment.payment_method_id === "pix" });
      return Response.json({ status: "pago" });
    }

    if (payment.status === "rejected" || payment.status === "cancelled") {
      return Response.json({ status: "rejeitado", statusDetail: payment.status_detail });
    }

    return Response.json({ status: "pendente", mpStatus: payment.status });
  } catch (err) {
    console.error("Erro ao verificar pagamento:", err);
    return Response.json({ status: "erro", error: err.message }, { status: 500 });
  }
}
