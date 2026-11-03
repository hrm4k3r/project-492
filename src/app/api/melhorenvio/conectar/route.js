import { NextResponse } from "next/server";
import { urlAutorizacao } from "../../../../lib/melhorenvio";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// Só admin inicia a conexão: senão qualquer visitante poderia ligar a loja à conta
// dele no Melhor Envio. Devolve a URL de autorização (o painel redireciona) e grava o state.
export async function GET(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const state = crypto.randomUUID();
  const response = NextResponse.json({ url: urlAutorizacao(state) });
  response.cookies.set("melhorenvio_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
