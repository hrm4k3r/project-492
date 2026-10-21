import { createClient } from "@supabase/supabase-js";
import { emitirNFe } from "../../../../lib/bling";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// POST /api/bling/nfe  { orderId }
// Emissão manual de NF-e a partir do painel admin.
export async function POST(request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) return Response.json({ error: "orderId obrigatório" }, { status: 400 });

    // Verifica se é admin (token no header Authorization)
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin();
    const { data: { user } } = await db.auth.getUser(token);
    const { data: profile } = await db.from("profiles").select("role").eq("id", user?.id).maybeSingle();
    if (profile?.role !== "admin") return Response.json({ error: "Acesso negado" }, { status: 403 });

    const resultado = await emitirNFe(orderId);
    return Response.json({ ok: true, nfe: resultado });
  } catch (err) {
    console.error("Erro ao emitir NF-e:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
