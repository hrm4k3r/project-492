import { createClient } from "@supabase/supabase-js";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";
import { enviarEmailEstoqueBaixo } from "../../../../lib/email";

export const dynamic = "force-dynamic";

const FORMAS = ["dinheiro", "pix", "debito", "credito"];

// POST /api/pdv/vender  { itens: [{ id, quantidade }], forma, cliente?, desconto?, observacao? }
// Venda presencial: só admin. Preço, estoque e baixa são decididos no banco (registrar_venda_balcao),
// que recusa quantidade acima do estoque e dá a baixa na mesma transação.
export async function POST(request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => ({}));
  const { itens, forma, cliente, desconto, observacao } = corpo;

  if (!Array.isArray(itens) || itens.length === 0) {
    return Response.json({ error: "Adicione pelo menos um produto à venda." }, { status: 400 });
  }
  for (const i of itens) {
    if (!i?.id || !Number.isInteger(i.quantidade) || i.quantidade < 1 || i.quantidade > 999) {
      return Response.json({ error: "Item ou quantidade inválidos." }, { status: 400 });
    }
  }
  if (!FORMAS.includes(forma)) {
    return Response.json({ error: "Escolha a forma de pagamento." }, { status: 400 });
  }
  const descontoNum = Number(desconto ?? 0);
  if (!Number.isFinite(descontoNum) || descontoNum < 0) {
    return Response.json({ error: "Desconto inválido." }, { status: 400 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user } } = await db.auth.getUser(token);

  const { data, error } = await db.rpc("registrar_venda_balcao", {
    p_operador: user?.id ?? null,
    p_itens: itens.map((i) => ({ produto_id: i.id, quantidade: i.quantidade })),
    p_forma: forma,
    p_cliente: typeof cliente === "string" ? cliente.slice(0, 120) : null,
    p_desconto: descontoNum,
    p_observacao: typeof observacao === "string" ? observacao.slice(0, 300) : null,
  });

  if (error) {
    // Erros de regra (estoque, produto) vêm com texto pronto para o lojista.
    const regra = /Estoque insuficiente|Produto não encontrado|Adicione pelo menos|Quantidade inválida/.test(error.message);
    if (!regra) console.error("Erro ao registrar venda do balcão:", error.message);
    return Response.json(
      { error: regra ? error.message : "Não foi possível registrar a venda." },
      { status: regra ? 409 : 500 }
    );
  }

  // O aviso de reposição não pode derrubar uma venda já registrada.
  if (data?.baixos?.length) await enviarEmailEstoqueBaixo(data.baixos).catch(() => {});

  return Response.json({ ok: true, vendaId: data.venda_id, total: data.total });
}
