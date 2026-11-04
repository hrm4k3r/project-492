import { emitirNFe } from "../../../../lib/bling";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// POST /api/bling/nfe  { orderId }
// Emissão (ou nova tentativa) de NF-e a partir do painel admin. Só admin.
// A mensagem de erro do Bling vai junto porque só o admin chega aqui e precisa saber o que corrigir.
export async function POST(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId } = await request.json().catch(() => ({}));
  if (!orderId) return Response.json({ error: "orderId obrigatório" }, { status: 400 });

  try {
    const resultado = await emitirNFe(orderId);
    return Response.json({ ok: true, nfe: resultado });
  } catch (err) {
    console.error(`Erro ao emitir NF-e do pedido ${orderId}:`, err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
