import { createClient } from "@supabase/supabase-js";
import { buscarPagamento } from "@/lib/mercadopago";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// O MP envia o webhook e espera 200. Sempre retornamos 200 para evitar retentativas.
export async function POST(request) {
  try {
    const payload = await request.json();

    // Ignora notificações que não sejam de pagamento
    if (payload.type !== "payment" || !payload.data?.id) {
      return Response.json({ ok: true });
    }

    const paymentId = String(payload.data.id);
    const payment = await buscarPagamento(paymentId);

    if (payment.status !== "approved") {
      return Response.json({ ok: true });
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      console.warn("Webhook MP: external_reference ausente, paymentId:", paymentId);
      return Response.json({ ok: true });
    }

    const db = supabaseAdmin();

    const { data: order } = await db
      .from("orders")
      .select("id, total, status")
      .eq("id", orderId)
      .single();

    if (!order || order.status === "pago") {
      return Response.json({ ok: true }); // Idempotente
    }

    // Confere valor pago (±1 centavo para arredondamentos)
    const expectedCents = Math.round(order.total * 100);
    const paidCents = Math.round(Number(payment.transaction_amount) * 100);

    if (Math.abs(expectedCents - paidCents) > 1) {
      console.error(
        `Webhook MP: valor divergente pedido ${orderId}. Esperado: ${expectedCents} | Recebido: ${paidCents}`
      );
      return Response.json({ ok: true });
    }

    await db
      .from("orders")
      .update({ status: "pago", payment_status: "pago" })
      .eq("id", orderId);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook MP:", err);
    return Response.json({ ok: true });
  }
}
