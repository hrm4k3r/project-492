import { createClient } from "@supabase/supabase-js";
import { calcularFrete } from "../../../../lib/melhorenvio";

export const dynamic = "force-dynamic";

function supabasePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function freteReserva(supabase, cepDestino) {
  const cepLimpo = cepDestino.replace(/\D/g, "");
  const viacep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`).then((r) => r.json()).catch(() => null);
  const uf = viacep?.uf;

  const { data: regras } = await supabase.from("freight_rules").select("*").eq("ativo", true).order("ordem", { ascending: true });
  const match =
    regras?.find((r) => r.estados?.includes(uf)) ??
    regras?.find((r) => !r.estados || r.estados.length === 0);

  if (!match) return [];
  return [{ servico: match.regiao, preco: Number(match.preco), prazoDias: match.prazo_dias, origem: "tabela" }];
}

export async function POST(request) {
  const { cep, itens } = await request.json();

  if (!cep || !Array.isArray(itens) || itens.length === 0) {
    return Response.json({ error: "cep e itens são obrigatórios." }, { status: 400 });
  }

  const supabase = supabasePublico();

  const ids = itens.map((i) => i.id);
  const { data: produtos, error: produtosError } = await supabase
    .from("produtos")
    .select("id, peso_kg, altura_cm, largura_cm, comprimento_cm, valor")
    .in("id", ids);

  if (produtosError || !produtos) {
    return Response.json({ error: "Não foi possível carregar os produtos do carrinho." }, { status: 400 });
  }

  const produtosMelhorEnvio = itens.map((item) => {
    const produto = produtos.find((p) => p.id === item.id);
    return {
      id: item.id,
      width: produto?.largura_cm ?? 15,
      height: produto?.altura_cm ?? 10,
      length: produto?.comprimento_cm ?? 15,
      weight: produto?.peso_kg ?? 0.5,
      insurance_value: Number(produto?.valor ?? 0) * item.quantidade,
      quantity: item.quantidade,
    };
  });

  try {
    const opcoes = await calcularFrete({ cepDestino: cep, produtos: produtosMelhorEnvio });
    const validas = opcoes
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        servico: `${o.company?.name ?? ""} ${o.name}`.trim(),
        preco: Number(o.price),
        prazoDias: o.delivery_time,
        origem: "melhor_envio",
      }))
      .sort((a, b) => a.preco - b.preco);

    if (validas.length > 0) {
      return Response.json({ opcoes: validas });
    }
    throw new Error("Nenhuma opção de frete disponível para esse CEP.");
  } catch (error) {
    console.error("Frete via Melhor Envio falhou, usando tabela fixa:", error.message);
    const opcoesReserva = await freteReserva(supabase, cep);
    return Response.json({ opcoes: opcoesReserva, aviso: "Frete estimado (cálculo automático indisponível)." });
  }
}
