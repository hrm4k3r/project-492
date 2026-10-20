import { createClient } from "@supabase/supabase-js";
import { enviarEmailConfirmacaoPedido, enviarEmailAtualizacaoStatus } from "@/lib/email";

const STATUS_VALIDOS = ["pendente", "pago", "preparando", "enviado", "entregue", "cancelado"];

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function verificarAdmin(token) {
  if (!token) return false;
  const db = supabaseAdmin();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

export async function PATCH(request, { params }) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const isAdmin = await verificarAdmin(token);
  if (!isAdmin) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = params;
  const { status } = await request.json();

  if (!STATUS_VALIDOS.includes(status)) {
    return Response.json({ error: "Status inválido" }, { status: 400 });
  }

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

  const { error } = await db
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Dispara email sem bloquear a resposta
  if (status === "pago") {
    enviarEmailConfirmacaoPedido(id).catch(console.error);
  } else {
    enviarEmailAtualizacaoStatus(id, status).catch(console.error);
  }

  return Response.json({ ok: true });
}
