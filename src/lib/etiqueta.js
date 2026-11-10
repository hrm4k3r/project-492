// ATENÇÃO: server-only. Gera a etiqueta de envio no Melhor Envio a partir do pedido.
//
// Três etapas, para nunca gastar dinheiro sem querer:
//   1. preparar: cria o envio no carrinho do Melhor Envio (NÃO cobra nada) e devolve serviço e preço;
//   2. comprar: paga com o saldo do Melhor Envio e gera a etiqueta (só roda depois de o lojista confirmar);
//   3. imprimir / rastreio: link do PDF e código de rastreio.
// O id do envio fica em orders.etiqueta_id assim que o carrinho é criado, então repetir uma etapa
// nunca cria (nem paga) um segundo envio.
import { chamarMelhorEnvio, calcularFrete } from "./melhorenvio";
import { produtosParaMelhorEnvio } from "./frete";
import { chaveDaNFe } from "./bling";
import { destinosDoAviso } from "./email";
import { LOJA } from "./loja";

const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");

// Dados do remetente (a Curadoria da Mesa). Podem ser ajustados em configuracoes.remetente sem mexer no código.
export function remetentePadrao(extra = {}) {
  return {
    name: `${LOJA.nome} - ${LOJA.slogan}`,
    phone: somenteDigitos(LOJA.whatsapp).replace(/^55/, ""),
    email: process.env.MELHORENVIO_REMETENTE_EMAIL || destinosDoAviso()[0] || "",
    company_document: somenteDigitos(LOJA.cnpj),
    state_register: "0054110090091",
    address: "Avenida Doutor Getúlio Vargas",
    number: "143",
    complement: "",
    district: "Centro",
    city: "São Lourenço",
    state_abbr: "MG",
    country_id: "BR",
    postal_code: "37470000",
    ...extra,
  };
}

// Pura (testável): monta o corpo do POST /me/cart.
export function montarCarrinho({ order, remetente, servicoId, chaveNFe, emailCliente, volumesBase }) {
  const { addresses: endereco, profiles: perfil, order_items: itens } = order;
  const doc = somenteDigitos(perfil?.documento);
  const ehCnpj = doc.length === 14;

  // O Melhor Envio quer uma entrada por volume (caixa); expande as que têm quantidade > 1.
  const volumes = (volumesBase ?? []).flatMap((v) =>
    Array.from({ length: Math.max(1, Number(v.quantity) || 1) }, () => ({
      height: Number(v.height),
      width: Number(v.width),
      length: Number(v.length),
      weight: Number(v.weight),
    }))
  );

  const valorDeclarado = Math.max(0, Number(order.total) - Number(order.frete ?? 0));

  return {
    service: Number(servicoId),
    from: remetente,
    to: {
      name: perfil?.full_name || "Cliente",
      phone: somenteDigitos(perfil?.phone),
      email: emailCliente || "",
      ...(ehCnpj ? { company_document: doc } : { document: doc }),
      address: endereco.street,
      number: endereco.number,
      complement: endereco.complement ?? "",
      district: endereco.neighborhood,
      city: endereco.city,
      state_abbr: String(endereco.state ?? "").toUpperCase(),
      country_id: "BR",
      postal_code: somenteDigitos(endereco.cep),
    },
    products: itens.map((i) => ({
      name: i.titulo,
      quantity: i.quantidade,
      unitary_value: Number(i.preco_unitario),
    })),
    volumes,
    options: {
      insurance_value: Math.round(valorDeclarado * 100) / 100,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: false,
      invoice: { key: chaveNFe },
      platform: LOJA.nome,
      tags: [{ tag: `Pedido ${String(order.id).slice(0, 8)}`, url: null }],
    },
  };
}

const COLUNAS_PEDIDO = `id, profile_id, status, total, frete, frete_servico, nfe_id, nfe_status, codigo_rastreio,
  etiqueta_id, etiqueta_status, etiqueta_erro,
  order_items ( titulo, quantidade, preco_unitario, produto_id ),
  addresses ( street, number, complement, neighborhood, city, state, cep ),
  profiles ( full_name, phone, documento )`;

async function carregarPedido(db, orderId) {
  const { data: order } = await db.from("orders").select(COLUNAS_PEDIDO).eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Pedido não encontrado.");
  return order;
}

const salvar = (db, orderId, campos) => db.from("orders").update(campos).eq("id", orderId);

function validarPedido(order) {
  if (!["pago", "preparando", "enviado"].includes(order.status)) {
    throw new Error("A etiqueta só pode ser gerada para pedido pago.");
  }
  if (!order.addresses || !order.frete_servico || /Retirada|motoboy/i.test(order.frete_servico)) {
    throw new Error("Este pedido não é uma entrega por transportadora (retirada ou motoboy não têm etiqueta).");
  }
}

// ETAPA 1: cria o envio no carrinho do Melhor Envio. Não cobra nada.
export async function prepararEtiqueta(db, orderId) {
  const order = await carregarPedido(db, orderId);
  validarPedido(order);

  // Já preparado: não cria outro envio, só mostra o mesmo.
  if (order.etiqueta_id) return { ...(await resumoDoEnvio(order)), jaPreparada: true };

  if (!order.nfe_status) {
    throw new Error("Emita a NF-e antes: os Correios e a Jadlog exigem a nota na etiqueta.");
  }
  const chaveNFe = await chaveDaNFe(order.nfe_id);
  if (!chaveNFe) {
    throw new Error("Não foi possível obter a chave de acesso da NF-e no Bling. Confira se a nota está autorizada.");
  }

  // Descobre o id do serviço que o cliente escolheu no carrinho (cotando de novo, com as mesmas caixas).
  const itensCotacao = order.order_items.map((i) => ({ id: i.produto_id, quantidade: i.quantidade }));
  const volumesBase = await produtosParaMelhorEnvio(db, itensCotacao);
  const cotacao = await calcularFrete({ cepDestino: order.addresses.cep, produtos: volumesBase });
  const servico = (Array.isArray(cotacao) ? cotacao : []).find(
    (o) => !o.error && `${o.company?.name ?? ""} ${o.name}`.trim() === order.frete_servico
  );
  if (!servico) {
    throw new Error(`O serviço "${order.frete_servico}" não está disponível agora para este CEP. Gere a etiqueta pelo site do Melhor Envio.`);
  }

  const { data: usuario } = await db.auth.admin.getUserById(order.profile_id);
  const { data: cfg } = await db.from("configuracoes").select("valor").eq("chave", "remetente").maybeSingle();
  const remetente = remetentePadrao(cfg?.valor && typeof cfg.valor === "object" ? cfg.valor : {});
  if (!remetente.email) {
    throw new Error("Falta o e-mail do remetente: defina MELHORENVIO_REMETENTE_EMAIL na Vercel (ou EMAIL_AVISO_LOJA).");
  }

  const corpo = montarCarrinho({
    order,
    remetente,
    servicoId: servico.id,
    chaveNFe,
    emailCliente: usuario?.user?.email,
    volumesBase,
  });

  const carrinho = await chamarMelhorEnvio("/me/cart", { method: "POST", body: corpo });
  if (!carrinho?.id) throw new Error("O Melhor Envio não devolveu o id do envio.");

  await salvar(db, orderId, { etiqueta_id: carrinho.id, etiqueta_status: "carrinho", etiqueta_erro: null });

  return {
    servico: order.frete_servico,
    preco: Number(carrinho.price ?? servico.price),
    prazoDias: servico.delivery_time ?? null,
    etiquetaId: carrinho.id,
  };
}

async function resumoDoEnvio(order) {
  const dados = await chamarMelhorEnvio(`/me/orders/${order.etiqueta_id}`);
  return {
    servico: order.frete_servico,
    preco: Number(dados?.price ?? 0),
    prazoDias: dados?.delivery_min ?? null,
    etiquetaId: order.etiqueta_id,
    status: order.etiqueta_status,
  };
}

// ETAPA 2: paga com o saldo do Melhor Envio e gera a etiqueta. Só roda depois da confirmação do lojista.
export async function comprarEtiqueta(db, orderId) {
  const order = await carregarPedido(db, orderId);
  validarPedido(order);
  if (!order.etiqueta_id) throw new Error("Prepare a etiqueta antes de comprar.");
  if (order.etiqueta_status === "gerada") return { ok: true, jaGerada: true, codigoRastreio: order.codigo_rastreio ?? null };

  // Trava contra clique duplo: só quem muda "carrinho" ou "paga" para "comprando" segue adiante.
  const emAndamento = order.etiqueta_status === "paga" ? "paga" : "carrinho";
  const { data: travado } = await db
    .from("orders")
    .update({ etiqueta_status: "comprando" })
    .eq("id", orderId)
    .eq("etiqueta_status", emAndamento)
    .select("id");
  if (!travado?.length) throw new Error("Esta etiqueta já está sendo comprada. Aguarde alguns segundos e atualize a página.");

  let ultimoEstado = emAndamento;
  try {
    if (emAndamento === "carrinho") {
      await chamarMelhorEnvio("/me/shipment/checkout", { method: "POST", body: { orders: [order.etiqueta_id] } });
      ultimoEstado = "paga";
      await salvar(db, orderId, { etiqueta_status: "paga", etiqueta_erro: null });
    }
    await chamarMelhorEnvio("/me/shipment/generate", { method: "POST", body: { orders: [order.etiqueta_id] } });
    await salvar(db, orderId, { etiqueta_status: "gerada", etiqueta_erro: null });
  } catch (err) {
    // Volta ao último estado seguro: se já pagou, uma nova tentativa só gera a etiqueta (não paga de novo).
    await salvar(db, orderId, { etiqueta_status: ultimoEstado, etiqueta_erro: String(err.message).slice(0, 300) });
    throw err;
  }

  return { ok: true, codigoRastreio: await buscarRastreio(db, orderId, order.etiqueta_id) };
}

// Lê o código de rastreio do envio e grava no pedido (o cliente vê em Minha conta e no e-mail de envio).
export async function buscarRastreio(db, orderId, etiquetaId) {
  const dados = await chamarMelhorEnvio(`/me/orders/${etiquetaId}`).catch(() => null);
  const codigo = String(dados?.tracking ?? "").trim();
  if (codigo) await salvar(db, orderId, { codigo_rastreio: codigo });
  return codigo || null;
}

export async function atualizarRastreio(db, orderId) {
  const order = await carregarPedido(db, orderId);
  if (!order.etiqueta_id) throw new Error("Este pedido ainda não tem etiqueta.");
  return { codigoRastreio: await buscarRastreio(db, orderId, order.etiqueta_id) };
}

// ETAPA 3: link do PDF da etiqueta (válido por pouco tempo; gerado a cada clique).
export async function urlDaEtiqueta(db, orderId) {
  const order = await carregarPedido(db, orderId);
  if (order.etiqueta_status !== "gerada") throw new Error("A etiqueta ainda não foi gerada.");
  const r = await chamarMelhorEnvio("/me/shipment/print", {
    method: "POST",
    body: { mode: "private", orders: [order.etiqueta_id] },
  });
  if (!r?.url) throw new Error("O Melhor Envio não devolveu o link da etiqueta.");
  return { url: r.url };
}
