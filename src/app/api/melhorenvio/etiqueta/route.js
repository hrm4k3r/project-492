import { createClient } from "@supabase/supabase-js";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";
import { prepararEtiqueta, comprarEtiqueta, atualizarRastreio, urlDaEtiqueta } from "../../../../lib/etiqueta";

export const dynamic = "force-dynamic";

const ACOES = {
  preparar: prepararEtiqueta, // cria o envio no carrinho do Melhor Envio (não cobra)
  comprar: comprarEtiqueta, // paga com o saldo do Melhor Envio e gera a etiqueta
  rastreio: atualizarRastreio, // relê o código de rastreio
  imprimir: urlDaEtiqueta, // link do PDF
};

// POST /api/melhorenvio/etiqueta  { orderId, acao: "preparar" | "comprar" | "rastreio" | "imprimir" }
// Só admin. "comprar" gasta saldo do Melhor Envio; o painel só chama depois de o lojista confirmar o valor.
export async function POST(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId, acao } = await request.json().catch(() => ({}));
  const executar = ACOES[acao];
  if (!orderId || !executar) {
    return Response.json({ error: "orderId e acao (preparar, comprar, rastreio ou imprimir) são obrigatórios." }, { status: 400 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    return Response.json({ ok: true, ...(await executar(db, orderId)) });
  } catch (err) {
    console.error(`Etiqueta (${acao}) do pedido ${orderId}:`, err.message);
    return Response.json({ error: err.message }, { status: 400 });
  }
}
