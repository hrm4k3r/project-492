import { createClient } from "@supabase/supabase-js";
import { cotarFrete } from "../../../../lib/frete";
import { documentoValido, somenteDigitos } from "../../../../lib/documento";
import { MOTOBOY_PADRAO, MOTOBOY_SERVICO, mesmaCidade } from "../../../../lib/motoboy";
import { enviarEmailPedidoRecebido, enviarEmailNovoPedidoParaLoja } from "../../../../lib/email";
import { enviarTelegramNovoPedido } from "../../../../lib/telegram";

export const dynamic = "force-dynamic";

const RETIRADA_SERVICO = "Retirada no local";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const arredondar = (n) => Math.round(n * 100) / 100;

// POST /api/pedidos/criar
// { itens: [{ id, quantidade }], tipoEntrega: "entrega" | "retirada", addressId (obrigatório), freteServico?, cupom? }
// Preços, cupom e frete são sempre recalculados aqui: nada de valor vindo do navegador.
export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const { itens, tipoEntrega, addressId, freteServico, cupom, documento } = await request.json();

    // CPF/CNPJ obrigatório e válido: a NF-e é emitida automaticamente após o pagamento.
    if (!documentoValido(documento)) {
      return Response.json({ error: "Informe um CPF ou CNPJ válido." }, { status: 400 });
    }

    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 100) {
      return Response.json({ error: "Carrinho vazio ou inválido." }, { status: 400 });
    }

    // Agrupa itens repetidos e valida quantidades
    const quantidades = new Map();
    for (const item of itens) {
      const qtd = Number(item?.quantidade);
      if (!item?.id || !Number.isInteger(qtd) || qtd < 1 || qtd > 999) {
        return Response.json({ error: "Item do carrinho inválido." }, { status: 400 });
      }
      quantidades.set(item.id, (quantidades.get(item.id) ?? 0) + qtd);
    }

    const { data: produtos, error: produtosError } = await db
      .from("produtos")
      .select("id, produto, valor, estoque")
      .in("id", [...quantidades.keys()])
      .eq("ativo", true);

    if (produtosError || !produtos || produtos.length !== quantidades.size) {
      return Response.json(
        { error: "Algum produto do carrinho não está mais disponível." },
        { status: 400 }
      );
    }

    // estoque NULL = produto sem controle de estoque. O estoque só baixa quando o pagamento é
    // confirmado; aqui só se recusa quem pede mais do que existe agora.
    const semEstoque = produtos.find((p) => p.estoque != null && quantidades.get(p.id) > p.estoque);
    if (semEstoque) {
      const restam = Number(semEstoque.estoque);
      return Response.json(
        {
          error: restam > 0
            ? `Só restam ${restam} unidade${restam > 1 ? "s" : ""} de "${semEstoque.produto}". Ajuste a quantidade no carrinho.`
            : `"${semEstoque.produto}" está esgotado. Remova do carrinho para continuar.`,
        },
        { status: 400 }
      );
    }

    const linhas = produtos.map((p) => {
      const quantidade = quantidades.get(p.id);
      const preco = Number(p.valor);
      return {
        produto_id: p.id,
        titulo: p.produto,
        preco_unitario: preco,
        quantidade,
        subtotal: arredondar(preco * quantidade),
      };
    });
    const subtotal = arredondar(linhas.reduce((acc, l) => acc + l.subtotal, 0));

    // O documento é gravado antes do cupom: "só primeira compra" confere o CPF/CNPJ no banco.
    const { error: documentoError } = await db
      .from("profiles")
      .update({ documento: somenteDigitos(documento) })
      .eq("id", user.id);
    if (documentoError) {
      return Response.json({ error: "Não foi possível salvar o CPF/CNPJ." }, { status: 500 });
    }

    // Cupom
    let desconto = 0;
    let couponCode = null;
    if (cupom && String(cupom).trim()) {
      const { data } = await db.rpc("validate_coupon", {
        coupon_code: String(cupom).trim(),
        order_subtotal: subtotal,
        customer_id: user.id, // a service_role não tem auth.uid(); usado nos cupons "só primeira compra"
      });
      const c = data?.[0];
      if (!c?.valid) {
        return Response.json({ error: c?.message ?? "Cupom inválido." }, { status: 400 });
      }
      const bruto =
        c.discount_type === "percent"
          ? (subtotal * Number(c.discount_value)) / 100
          : Number(c.discount_value);
      desconto = arredondar(Math.min(subtotal, bruto));
      couponCode = String(cupom).trim().toUpperCase();
    }

    // Frete
    let frete = 0;
    let freteServicoFinal = RETIRADA_SERVICO;

    if (!["entrega", "retirada", "motoboy"].includes(tipoEntrega)) {
      return Response.json({ error: "Tipo de entrega inválido." }, { status: 400 });
    }

    // Endereço completo é obrigatório em qualquer modalidade (inclusive retirada):
    // a NF-e precisa dos dados do destinatário.
    const { data: endereco } = await db
      .from("addresses")
      .select("id, cep, street, number, neighborhood, city, state")
      .eq("id", addressId ?? "")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!endereco) {
      return Response.json({ error: "Informe um endereço válido para o pedido." }, { status: 400 });
    }
    const camposObrigatorios = ["cep", "street", "number", "neighborhood", "city", "state"];
    if (camposObrigatorios.some((c) => !String(endereco[c] ?? "").trim())) {
      return Response.json(
        { error: "Endereço incompleto: preencha rua, número, bairro, cidade, UF e CEP." },
        { status: 400 }
      );
    }
    const addressIdFinal = endereco.id;

    if (tipoEntrega === "motoboy") {
      const { data: cfgs } = await db
        .from("configuracoes")
        .select("chave, valor")
        .in("chave", ["motoboy_preco", "motoboy_cidade"]);
      const mapa = Object.fromEntries((cfgs ?? []).map((c) => [c.chave, c.valor]));
      const precoMotoboy = Number(mapa.motoboy_preco ?? MOTOBOY_PADRAO.preco);
      const cidadeMotoboy = String(mapa.motoboy_cidade ?? MOTOBOY_PADRAO.cidade);

      if (!(precoMotoboy > 0) || !mesmaCidade(endereco.city, cidadeMotoboy)) {
        return Response.json(
          { error: `A entrega por motoboy atende apenas ${cidadeMotoboy}.` },
          { status: 400 }
        );
      }
      frete = arredondar(precoMotoboy);
      freteServicoFinal = MOTOBOY_SERVICO;
    } else if (tipoEntrega === "entrega") {
      const { data: cfg } = await db
        .from("configuracoes")
        .select("valor")
        .eq("chave", "frete_gratis_acima")
        .maybeSingle();
      const freteGratisAcima = Number(cfg?.valor ?? 1000);
      const gratis = freteGratisAcima > 0 && subtotal >= freteGratisAcima;

      const { opcoes } = await cotarFrete(
        db,
        endereco.cep,
        [...quantidades].map(([id, quantidade]) => ({ id, quantidade }))
      );
      const escolhida = opcoes.find((o) => o.servico === freteServico) ?? (gratis ? opcoes[0] : null);
      if (!escolhida && !gratis) {
        return Response.json({ error: "Não foi possível calcular o frete." }, { status: 400 });
      }
      frete = gratis ? 0 : escolhida.preco;
      freteServicoFinal = escolhida?.servico ?? null;
    }

    const total = arredondar(Math.max(0, subtotal - desconto) + frete);

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        profile_id: user.id,
        address_id: addressIdFinal,
        status: "pendente",
        subtotal,
        frete,
        frete_servico: freteServicoFinal,
        desconto,
        total,
        coupon_code: couponCode,
      })
      .select("id")
      .single();

    if (orderError) {
      return Response.json({ error: "Não foi possível registrar o pedido." }, { status: 500 });
    }

    const { error: itemsError } = await db
      .from("order_items")
      .insert(linhas.map((l) => ({ ...l, order_id: order.id })));

    if (itemsError) {
      await db.from("orders").delete().eq("id", order.id);
      return Response.json({ error: "Não foi possível salvar os itens do pedido." }, { status: 500 });
    }

    // Aviso "recebemos o seu pedido". Espera o envio (na Vercel, trabalho solto após a resposta
    // pode ser encerrado); falha de e-mail só é registrada e não derruba o pedido.
    // O lojista também é avisado na criação, para acompanhar pedidos que entram antes do pagamento.
    await Promise.all([
      Promise.resolve(enviarEmailPedidoRecebido(order.id)).catch(console.error),
      Promise.resolve(enviarEmailNovoPedidoParaLoja(order.id, { pago: false })).catch(console.error),
      Promise.resolve(enviarTelegramNovoPedido(order.id, { pago: false })).catch(console.error),
    ]);

    return Response.json({ orderId: order.id });
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    return Response.json({ error: "Erro ao criar pedido." }, { status: 500 });
  }
}
