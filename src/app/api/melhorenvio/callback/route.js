import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { concluirConexao } from "../../../../lib/melhorenvio";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const erroAutorizacao = searchParams.get("error");

  const cookieStore = cookies();
  const stateEsperado = cookieStore.get("melhorenvio_state")?.value;

  const baseUrl = new URL("/admin/frete", request.url);

  if (erroAutorizacao) {
    baseUrl.searchParams.set("melhorenvio", "erro");
    baseUrl.searchParams.set("motivo", erroAutorizacao);
    return NextResponse.redirect(baseUrl);
  }

  if (!code || !state || state !== stateEsperado) {
    baseUrl.searchParams.set("melhorenvio", "erro");
    baseUrl.searchParams.set("motivo", "state_invalido");
    return NextResponse.redirect(baseUrl);
  }

  try {
    await concluirConexao(code);
    baseUrl.searchParams.set("melhorenvio", "conectado");
  } catch (error) {
    console.error("Erro ao conectar Melhor Envio:", error);
    baseUrl.searchParams.set("melhorenvio", "erro");
    baseUrl.searchParams.set("motivo", error.message);
  }

  const response = NextResponse.redirect(baseUrl);
  response.cookies.set("melhorenvio_state", "", { path: "/", maxAge: 0 });
  return response;
}
