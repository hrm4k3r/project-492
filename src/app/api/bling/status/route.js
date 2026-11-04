import { statusConexao } from "../../../../lib/bling";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// Só o painel admin consulta: o estado da integração fiscal não é público.
export async function GET(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const status = await statusConexao();
    return Response.json(status);
  } catch (error) {
    console.error("Erro ao consultar status do Bling:", error);
    return Response.json({ conectado: false, error: "Não foi possível consultar o status." }, { status: 500 });
  }
}
