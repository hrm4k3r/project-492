import { diagnosticarPermissoes } from "../../../../lib/bling";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/bling/diagnostico — só admin. Testa leituras no Bling para achar permissão faltando.
export async function GET(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    return Response.json({ testes: await diagnosticarPermissoes() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
