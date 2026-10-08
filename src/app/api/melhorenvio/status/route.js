import { statusConexao } from "../../../../lib/melhorenvio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await statusConexao();
    return Response.json(status);
  } catch (error) {
    return Response.json({ conectado: false, error: error.message }, { status: 500 });
  }
}
