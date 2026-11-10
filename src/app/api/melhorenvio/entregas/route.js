import { createClient } from "@supabase/supabase-js";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";
import { sincronizarEntregas } from "../../../../lib/entregas";

export const dynamic = "force-dynamic";

// POST /api/melhorenvio/entregas
// Só admin. Consulta o Melhor Envio e atualiza o status dos pedidos com etiqueta (preparando, enviado,
// entregue). É o botão "Atualizar entregas" do painel; a mesma rotina roda sozinha uma vez por dia.
export async function POST(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return Response.json({ ok: true, ...(await sincronizarEntregas(db)) });
  } catch (err) {
    console.error("Erro ao atualizar entregas:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
