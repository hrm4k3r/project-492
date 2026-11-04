import { statusConexao } from "../../../../lib/melhorenvio";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// Só o painel admin consulta: o estado da integração de frete não é público.
export async function GET(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const status = await statusConexao();
    return Response.json(status);
  } catch (error) {
    console.error("Erro ao consultar status do Melhor Envio:", error);
    return Response.json({ conectado: false, error: "Não foi possível consultar o status." }, { status: 500 });
  }
}
