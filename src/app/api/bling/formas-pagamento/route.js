import { listarFormasPagamento } from "../../../../lib/bling";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/bling/formas-pagamento — só admin. Lista as formas de pagamento do Bling com seus ids.
export async function GET(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    return Response.json({ formas: await listarFormasPagamento() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
