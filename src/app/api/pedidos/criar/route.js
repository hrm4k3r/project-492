import { createClient } from "@supabase/supabase-js";
import { cotarFrete } from "../../../../lib/frete";

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
// { itens: [{ id, quantidade }], tipoEntrega: "entrega" | "retirada", addressId?, freteServico?, cupom? }
// Preços, cupom e frete são sempre recalculados aqui: nada de valor vindo do navegador.
export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const db = supabaseAdmin();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const { itens, tipoEntrega, addressId, freteServico, cupom } = await request.json();

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
      .select("id, produto, valor")
      .in("id", [...quantidades.keys()])
      .eq("ativo", true);

    if (produtosError || !produtos || produtos.length !== quantidades.size) {
      return Response.json(
        { error: "Algum produto do carrinho não está mais disponível." },
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

    // Cupom
    let desconto = 0;
    let couponCode = null;
    if (cupom && String(cupom).trim()) {
      const { data } = await db.rpc("validate_coupon", {
        coupon_code: String(cupom).trim(),
        order_subtotal: subtotal,
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
    let addressIdFinal = null;

    if (tipoEntrega === "entrega") {
      const { data: endereco } = await db
        .from("addresses")
        .select("id, cep")
        .eq("id", addressId ?? "")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!endereco) {
        return Response.json({ error: "Endereço de entrega inválido." }, { status: 400 });
      }
      addressIdFinal = endereco.id;

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
    } else if (tipoEntrega !== "retirada") {
      return Response.json({ error: "Tipo de entrega inválido." }, { status: 400 });
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

    return Response.json({ orderId: order.id });
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    return Response.json({ error: "Erro ao criar pedido." }, { status: 500 });
  }
}
