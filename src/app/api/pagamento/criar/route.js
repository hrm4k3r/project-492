import { createClient } from "@supabase/supabase-js";
import { criarPagamento } from "@/lib/mercadopago";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    const { orderId, selectedPaymentMethod, formData } = await request.json();

    if (!orderId || !selectedPaymentMethod || !formData) {
      return Response.json(
        { error: "orderId, selectedPaymentMethod e formData são obrigatórios" },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, total, profile_id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    if (order.status === "pago") {
      return Response.json({ error: "Pedido já pago" }, { status: 409 });
    }

    // Busca e-mail do pagador via auth
    const { data: authUser } = await db.auth.admin.getUserById(order.profile_id);
    const payerEmail = authUser?.user?.email || formData.payer?.email;
    const payerIdentification = formData.payer?.identification;

    const payment = await criarPagamento({
      orderId,
      total: order.total,
      payerEmail,
      payerIdentification,
      selectedPaymentMethod,
      formData,
    });

    const isApproved = payment.status === "approved";
    const isPending = payment.status === "in_process" || payment.status === "pending";

    await db
      .from("orders")
      .update({
        payment_provider: "mercadopago",
        payment_id: String(payment.id),
        ...(isApproved ? { status: "pago", payment_status: "pago" } : {}),
      })
      .eq("id", orderId);

    const result = {
      status: payment.status,
      statusDetail: payment.status_detail,
    };

    // Retorna QR code para Pix
    if (
      payment.payment_method_id === "pix" &&
      payment.point_of_interaction?.transaction_data
    ) {
      result.pixQrCode = payment.point_of_interaction.transaction_data.qr_code;
      result.pixQrCodeBase64 = payment.point_of_interaction.transaction_data.qr_code_base64;
    }

    result.paymentId = payment.id;
    return Response.json(result);
  } catch (err) {
    console.error("Erro ao criar pagamento MP:", err);
    // Inclui stack em dev ou mensagem detalhada em prod para facilitar debug
    return Response.json(
      { error: err.message, detail: err.cause ?? err.stack?.split("\n")[0] ?? null },
      { status: 500 }
    );
  }
}
