import { createClient } from "@supabase/supabase-js";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// POST /api/pdv/cancelar  { vendaId }
// Cancela uma venda do balcão e devolve os produtos ao estoque. Só admin.
export async function POST(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { vendaId } = await request.json().catch(() => ({}));
  if (!vendaId) return Response.json({ error: "vendaId obrigatório" }, { status: 400 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await db.rpc("cancelar_venda_balcao", { p_venda_id: vendaId });

  if (error) {
    const regra = /não encontrada|já foi cancelada/.test(error.message);
    if (!regra) console.error("Erro ao cancelar venda do balcão:", error.message);
    return Response.json(
      { error: regra ? error.message : "Não foi possível cancelar a venda." },
      { status: regra ? 409 : 500 }
    );
  }
  return Response.json({ ok: true });
}
