import { createClient } from "@supabase/supabase-js";
import { sincronizarEntregas } from "../../../../lib/entregas";

export const dynamic = "force-dynamic";

// GET /api/cron/entregas  (chamada pela Vercel Cron, uma vez por dia; ver vercel.json)
// A Vercel manda "Authorization: Bearer <CRON_SECRET>" quando a variável CRON_SECRET existe no projeto.
// Sem a variável configurada, ou com segredo errado, a rota recusa: ninguém de fora dispara a rotina.
export async function GET(request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return Response.json({ ok: true, ...(await sincronizarEntregas(db)) });
  } catch (err) {
    console.error("Erro na verificação diária de entregas:", err.message);
    return Response.json({ error: "Falha ao atualizar entregas." }, { status: 500 });
  }
}
