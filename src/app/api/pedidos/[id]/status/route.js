import { createClient } from "@supabase/supabase-js";
import { enviarEmailAtualizacaoStatus } from "@/lib/email";
import { requisicaoDeAdmin } from "@/lib/adminAuth";
import { confirmarPagamento } from "@/lib/pedidos";

const STATUS_VALIDOS = ["pendente", "pago", "preparando", "enviado", "entregue", "cancelado"];

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function PATCH(request, { params }) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = params;
  const { status, codigoRastreio } = await request.json();

  if (!STATUS_VALIDOS.includes(status)) {
    return Response.json({ error: "Status inválido" }, { status: 400 });
  }

  // Código de rastreio é opcional e só faz sentido ao marcar como enviado.
  const rastreio = status === "enviado" ? String(codigoRastreio ?? "").trim().slice(0, 60) : "";

  const db = supabaseAdmin();

  const { data: order } = await db
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!order) {
    return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.status === status) {
    return Response.json({ ok: true }); // sem mudança, nada a fazer
  }

  // Confirmar um pedido pendente como pago (ex.: Pix conferido à mão) segue o mesmo
  // caminho do Mercado Pago: e-mail de confirmação + NF-e, uma única vez.
  if (status === "pago" && order.status === "pendente") {
    try {
      await confirmarPagamento(db, id);
    } catch (error) {
      console.error("Erro ao confirmar pagamento manualmente:", error);
      return Response.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  const { error } = await db
    .from("orders")
    .update(rastreio ? { status, codigo_rastreio: rastreio } : { status })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return Response.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 });
  }

  // Espera o envio (na Vercel, trabalho solto após a resposta pode ser encerrado)
  await Promise.resolve(enviarEmailAtualizacaoStatus(id, status)).catch(console.error);

  return Response.json({ ok: true });
}
