// ATENÇÃO: server-only (usa melhorenvio.js). Nunca importe em componentes client.
import { calcularFrete } from "./melhorenvio";

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

// Monta a lista de produtos (peso, medidas, seguro) que o Melhor Envio recebe, lendo do banco.
// Usada pela cotação do carrinho e pelo simulador do painel, para as duas darem o mesmo resultado.
export async function produtosParaMelhorEnvio(supabase, itens) {
  const ids = itens.map((i) => i.id);
  const { data: produtos, error: produtosError } = await supabase
    .from("produtos")
    .select("id, peso_kg, altura_cm, largura_cm, comprimento_cm, valor")
    .in("id", ids);

  if (produtosError || !produtos) {
    throw new Error("Não foi possível carregar os produtos do carrinho.");
  }

  return itens.map((item) => {
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
}

// itens: [{ id, quantidade }]. Retorna { opcoes, aviso? } com preços calculados no servidor.
export async function cotarFrete(supabase, cep, itens) {
  const produtosMelhorEnvio = await produtosParaMelhorEnvio(supabase, itens);

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

    if (validas.length > 0) return { opcoes: validas };
    throw new Error("Nenhuma opção de frete disponível para esse CEP.");
  } catch (error) {
    // CEP que o Melhor Envio recusa (422) não é pane: avisa o cliente em vez de cobrar a tabela fixa.
    if (error.status === 422) {
      throw new Error("Não encontramos esse CEP. Confira o número e tente de novo.");
    }
    console.error("Frete via Melhor Envio falhou, usando tabela fixa:", error.message);
    const opcoesReserva = await freteReserva(supabase, cep);
    return { opcoes: opcoesReserva, aviso: "Frete estimado (cálculo automático indisponível)." };
  }
}
