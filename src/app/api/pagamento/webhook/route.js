import { createClient } from "@supabase/supabase-js";
import { buscarPagamento } from "@/lib/mercadopago";
import { confirmarPagamento } from "@/lib/pedidos";
import { assinaturaValida } from "@/lib/mpAssinatura";
import { centavosEsperados } from "@/lib/pix";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// O MP espera 200. Notificações ignoradas respondem 200; assinatura inválida, 401; falha inesperada,
// 500 para o MP tentar de novo (seguro: confirmarPagamento é idempotente).
export async function POST(request) {
  try {
    const payload = await request.json();

    // Ignora notificações que não sejam de pagamento
    if (payload.type !== "payment" || !payload.data?.id) {
      return Response.json({ ok: true });
    }

    const dataId = new URL(request.url).searchParams.get("data.id") ?? payload.data.id;
    if (!assinaturaValida(request, dataId)) {
      return Response.json({ error: "Assinatura inválida" }, { status: 401 });
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
      .select("id, total, desconto_pix, status")
      .eq("id", orderId)
      .single();

    if (!order || order.status === "pago") {
      return Response.json({ ok: true }); // Idempotente
    }

    // Confere valor pago (±1 centavo para arredondamentos)
    const expectedCents = centavosEsperados(order, payment);
    const paidCents = Math.round(Number(payment.transaction_amount) * 100);

    if (Math.abs(expectedCents - paidCents) > 1) {
      console.error(
        `Webhook MP: valor divergente pedido ${orderId}. Esperado: ${expectedCents} | Recebido: ${paidCents}`
      );
      return Response.json({ ok: true });
    }

    await confirmarPagamento(db, orderId, { pix: payment.payment_method_id === "pix" });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook MP:", err);
    return Response.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
