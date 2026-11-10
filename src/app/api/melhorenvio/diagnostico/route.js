import { createClient } from "@supabase/supabase-js";
import { calcularFrete } from "../../../../lib/melhorenvio";
import { produtosParaMelhorEnvio } from "../../../../lib/frete";
import { requisicaoDeAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// POST /api/melhorenvio/diagnostico  { cep, itens: [{ id, quantidade }] }
// Só admin. Devolve a resposta do Melhor Envio serviço por serviço, INCLUSIVE os indisponíveis e o
// motivo (o carrinho esconde esses). Serve para entender por que falta uma transportadora ou o preço
// está alto. Não compra nada: só simula.
export async function POST(request) {
  if (!(await requisicaoDeAdmin(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { cep, itens } = await request.json().catch(() => ({}));
  const cepLimpo = String(cep ?? "").replace(/\D/g, "");
  if (cepLimpo.length !== 8 || !Array.isArray(itens) || itens.length === 0) {
    return Response.json({ error: "Informe um CEP válido e pelo menos um produto." }, { status: 400 });
  }

  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const produtos = await produtosParaMelhorEnvio(db, itens);
    const bruto = await calcularFrete({ cepDestino: cepLimpo, produtos });

    const servicos = (Array.isArray(bruto) ? bruto : []).map((o) => ({
      empresa: o.company?.name ?? "",
      servico: o.name ?? "",
      preco: o.price != null ? Number(o.price) : null,
      precoCheio: o.custom_price != null ? Number(o.custom_price) : null,
      prazoDias: o.delivery_time ?? null,
      erro: o.error ?? null,
    }));

    return Response.json({
      origem: process.env.MELHORENVIO_CEP_ORIGEM ?? null,
      enviado: produtos.map((p) => ({
        largura: Number(p.width), altura: Number(p.height), comprimento: Number(p.length),
        pesoKg: Number(p.weight), quantidade: p.quantity, seguro: p.insurance_value,
      })),
      servicos,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
