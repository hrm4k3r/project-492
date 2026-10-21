import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { concluirConexao } from "../../../../lib/bling";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const erroAutorizacao = searchParams.get("error");

  const cookieStore = cookies();
  const stateEsperado = cookieStore.get("bling_state")?.value;

  const baseUrl = new URL("/admin/configuracoes", request.url);

  if (erroAutorizacao) {
    baseUrl.searchParams.set("bling", "erro");
    baseUrl.searchParams.set("motivo", erroAutorizacao);
    return NextResponse.redirect(baseUrl);
  }

  if (!code || !state || state !== stateEsperado) {
    baseUrl.searchParams.set("bling", "erro");
    baseUrl.searchParams.set("motivo", "state_invalido");
    return NextResponse.redirect(baseUrl);
  }

  try {
    await concluirConexao(code);
    baseUrl.searchParams.set("bling", "conectado");
  } catch (error) {
    console.error("Erro ao conectar Bling:", error);
    baseUrl.searchParams.set("bling", "erro");
    baseUrl.searchParams.set("motivo", error.message);
  }

  const response = NextResponse.redirect(baseUrl);
  response.cookies.set("bling_state", "", { path: "/", maxAge: 0 });
  return response;
}
