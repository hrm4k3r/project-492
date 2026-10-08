import { NextResponse } from "next/server";
import { urlAutorizacao } from "../../../../lib/melhorenvio";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomUUID();
  const url = urlAutorizacao(state);

  const response = NextResponse.redirect(url, 302);
  response.cookies.set("melhorenvio_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
