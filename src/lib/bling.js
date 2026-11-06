// ATENÇÃO: server-only. Nunca importe em componentes client.
import { createClient } from "@supabase/supabase-js";
import { buscarPagamento } from "./mercadopago";

const BLING_BASE = "https://www.bling.com.br/Api/v3";
const INTEGRACAO_ID = "bling";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function urlAutorizacao(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.BLING_CLIENT_ID,
    redirect_uri: process.env.BLING_REDIRECT_URI,
    state,
  });
  return `${BLING_BASE}/oauth/authorize?${params.toString()}`;
}

function basicAuth() {
  const encoded = Buffer.from(
    `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
  ).toString("base64");
  return `Basic ${encoded}`;
}

async function trocarCodigoPorToken(code) {
  const res = await fetch(`${BLING_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "enable-jwt": "1",
      "User-Agent": "CuradoriaDaMesa/1.0 (+https://www.curadoriadamesa.com.br)",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.BLING_REDIRECT_URI,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description ?? `Bling OAuth erro ${res.status}`);
  }
  return data;
}

async function renovarToken(refreshToken) {
  const res = await fetch(`${BLING_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "enable-jwt": "1",
      "User-Agent": "CuradoriaDaMesa/1.0 (+https://www.curadoriadamesa.com.br)",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description ?? `Bling refresh erro ${res.status}`);
  }
  return data;
}

async function salvarTokens(tokenResponse) {
  const supabase = supabaseAdmin();
  const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000;
  await supabase.from("integracoes").upsert({
    id: INTEGRACAO_ID,
    dados: {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: expiresAt,
      scope: tokenResponse.scope ?? null,
    },
    updated_at: new Date().toISOString(),
  });
}

export async function concluirConexao(code) {
  const tokenResponse = await trocarCodigoPorToken(code);
  await salvarTokens(tokenResponse);
}

export async function statusConexao() {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("integracoes")
    .select("dados, updated_at")
    .eq("id", INTEGRACAO_ID)
    .maybeSingle();
  if (!data) return { conectado: false };
  return { conectado: true, conectadoEm: data.updated_at, escopos: data.dados?.scope ?? null };
}

async function obterAccessTokenValido() {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("integracoes")
    .select("dados")
    .eq("id", INTEGRACAO_ID)
    .maybeSingle();

  if (!data) throw new Error("Bling ainda não conectado. Conecte em Admin → Configurações.");

  const { access_token, refresh_token, expires_at } = data.dados;
  if (Date.now() < expires_at) return access_token;

  const novosTokens = await renovarToken(refresh_token);
  await salvarTokens(novosTokens);
  return novosTokens.access_token;
}


// ─── NF-e ────────────────────────────────────────────────────────────────────

// Tipo de pagamento do Mercado Pago -> variável com o id da forma de pagamento no Bling.
// Os ids são da conta Bling da loja (Preferências > Formas de pagamento), por isso vêm do ambiente.
const FORMA_PAGAMENTO_ENV = {
  bank_transfer: "BLING_FORMA_PGTO_PIX",
  credit_card: "BLING_FORMA_PGTO_CREDITO",
  debit_card: "BLING_FORMA_PGTO_DEBITO",
};

function idFormaPagamento(variavel, tipo) {
  const id = Number(process.env[variavel]);
  if (!id) throw new Error(`Defina ${variavel} com o id da forma de pagamento no Bling (${tipo}).`);
  return id;
}

async function formaPagamentoDoPedido(paymentId) {
  // Pedido confirmado à mão no painel não tem payment_id: a loja só aceita Pix, então é Pix.
  if (!paymentId) return idFormaPagamento("BLING_FORMA_PGTO_PIX", "pix");

  const payment = await buscarPagamento(String(paymentId));
  const tipo = payment?.payment_type_id;
  const variavel = FORMA_PAGAMENTO_ENV[tipo];
  if (!variavel) throw new Error(`Tipo de pagamento sem mapeamento para o Bling: ${tipo}.`);
  return idFormaPagamento(variavel, tipo);
}

// Cabeçalhos que ajudam o suporte do Bling a achar a chamada (ou a camada que a barrou).
function infoDaResposta(res) {
  const partes = ["server", "cf-ray", "x-request-id"]
    .map((h) => (res.headers?.get?.(h) ? `${h}=${res.headers.get(h)}` : null))
    .filter(Boolean);
  return partes.length ? `, ${partes.join(", ")}` : "";
}

function mensagemDeErro(data, status) {
  const mensagem = data?.error?.message;
  const campos = data?.error?.fields?.map((f) => f.msg).filter(Boolean).join("; ");
  if (mensagem && campos) return `${mensagem}: ${campos}`;
  return mensagem ?? (campos || `Bling erro ${status}`);
}

// Chamada autenticada à API do Bling. Erro de rede/timeout vira "semResposta": nesse caso a
// operação pode ter sido feita mesmo assim, e quem chama precisa tratar isso.
async function chamarBling(token, caminho, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${BLING_BASE}${caminho}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "enable-jwt": "1",
        "User-Agent": "CuradoriaDaMesa/1.0 (+https://www.curadoriadamesa.com.br)",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    const erro = new Error(`Sem resposta do Bling (${err.message}).`);
    erro.semResposta = true;
    throw erro;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalhe = res.status === 401 || res.status === 403
      ? ` [${method} ${caminho.split("?")[0]}, HTTP ${res.status}${data?.error?.type ? `, ${data.error.type}` : ""}${infoDaResposta(res)}]`
      : "";
    throw new Error(mensagemDeErro(data, res.status) + detalhe);
  }
  return data;
}

const SEM_RESPOSTA_AO_CRIAR =
  "O Bling não respondeu ao criar a nota. Confira em Vendas > Notas Fiscais de Saída se ela foi criada antes de tentar de novo, para não emitir duas.";

function montarPayload(order, formaPagamentoBling) {
  const { addresses: address, profiles: profile, order_items: itens } = order;
  const estadoOrigem = process.env.BLING_ESTADO_ORIGEM ?? "SP";
  const docLimpo = profile.documento.replace(/\D/g, "");

  return {
    tipo: 1,
    finalidade: 1,
    naturezaOperacao: "VENDA DE MERCADORIA AO CONSUMIDOR",
    dataOperacao: new Date(order.created_at).toISOString().replace("T", " ").slice(0, 19),
    contato: {
      nome: profile.full_name || "Cliente",
      tipoPessoa: docLimpo.length === 14 ? "J" : "F",
      numeroDocumento: docLimpo,
      endereco: {
        endereco: address.street,
        numero: address.number,
        complemento: address.complement ?? "",
        bairro: address.neighborhood,
        municipio: address.city,
        uf: address.state,
        cep: address.cep.replace(/\D/g, ""),
        pais: "Brasil",
      },
    },
    itens: itens.map((item) => {
      const cfop = item.produtos?.cfop ?? (address.state === estadoOrigem ? "5102" : "6102");
      return {
        descricao: item.titulo,
        quantidade: item.quantidade,
        valor: Number(item.preco_unitario),
        cfop,
        unidade: item.produtos?.unidade ?? "UN",
        produto: {
          nome: item.titulo,
          unidade: item.produtos?.unidade ?? "UN",
          ncm: (item.produtos?.ncm ?? "").replace(/\D/g, ""),
        },
      };
    }),
    parcelas: [
      {
        dataVencimento: new Date(order.created_at).toISOString().slice(0, 10),
        valor: Number(order.total),
        formaPagamento: { id: formaPagamentoBling },
      },
    ],
    transporte: {
      fretePorConta: 1, // 0 = emitente, 1 = destinatário
      frete: Number(order.frete),
    },
  };
}

/**
 * Emite a NF-e do pedido no Bling em duas etapas: cria a nota (POST /nfe) e a envia à Sefaz
 * (POST /nfe/{id}/enviar). O id da nota é gravado no pedido assim que ela é criada, então uma
 * nova tentativa depois de falha no envio só reenvia a mesma nota, nunca cria outra.
 * O resultado (nfe_id, nfe_status, nfe_erro) fica no pedido e aparece em Admin > Pedidos.
 */
export async function emitirNFe(orderId) {
  const supabase = supabaseAdmin();
  try {
    return await emitir(supabase, orderId);
  } catch (err) {
    await supabase
      .from("orders")
      .update({ nfe_erro: String(err.message ?? err).slice(0, 300) })
      .eq("id", orderId);
    throw err;
  }
}

async function emitir(supabase, orderId) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `id, total, subtotal, frete, desconto, created_at, payment_id, nfe_id, nfe_status,
       order_items ( id, titulo, preco_unitario, quantidade, subtotal, produto_id,
         produtos ( ncm, unidade, cfop )
       ),
       addresses ( street, number, complement, neighborhood, city, state, cep ),
       profiles ( full_name, documento )`
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error(`Pedido ${orderId} não encontrado.`);

  // Já enviada à Sefaz: nada a fazer (evita nota duplicada por reenvio de webhook ou clique repetido).
  if (order.nfe_id && order.nfe_status) return { id: order.nfe_id, situacao: order.nfe_status, jaEmitida: true };

  let nfeId = order.nfe_id;

  if (!nfeId) {
    const { addresses: address, profiles: profile, order_items: itens } = order;

    if (!address) throw new Error("Pedido sem endereço de entrega.");
    if (!profile?.documento) throw new Error("Cliente sem CPF/CNPJ cadastrado (necessário para NF-e).");

    const itensSemNcm = itens.filter((i) => !i.produtos?.ncm);
    if (itensSemNcm.length > 0) {
      const nomes = itensSemNcm.map((i) => i.titulo).join(", ");
      throw new Error(`Produto(s) sem NCM: ${nomes}. Preencha o NCM antes de emitir a NF-e.`);
    }

    const formaPagamentoBling = await formaPagamentoDoPedido(order.payment_id);
    const accessToken = await obterAccessTokenValido();

    let criada;
    try {
      criada = await chamarBling(accessToken, "/nfe", {
        method: "POST",
        body: montarPayload(order, formaPagamentoBling),
      });
    } catch (err) {
      throw err.semResposta ? new Error(SEM_RESPOSTA_AO_CRIAR) : err;
    }

    nfeId = String(criada?.data?.id ?? "");
    if (!nfeId) throw new Error("O Bling não devolveu o id da nota criada.");

    // Grava já: se o envio falhar, a nova tentativa reaproveita esta nota.
    await supabase.from("orders").update({ nfe_id: nfeId, nfe_erro: null }).eq("id", orderId);
  }

  const accessToken = await obterAccessTokenValido();
  await chamarBling(accessToken, `/nfe/${encodeURIComponent(nfeId)}/enviar?enviarEmail=false`, { method: "POST" });

  // Situação depois do envio. A transmissão à Sefaz pode levar um tempo, então falha aqui não
  // invalida o envio: guarda "enviada" e o lojista confere no Bling.
  let situacao = "enviada";
  try {
    const consulta = await chamarBling(accessToken, `/nfe/${encodeURIComponent(nfeId)}`);
    situacao = String(consulta?.data?.situacao ?? "enviada");
  } catch {
    // mantém "enviada"
  }

  await supabase.from("orders").update({ nfe_status: situacao, nfe_erro: null }).eq("id", orderId);
  return { id: nfeId, situacao };
}

// Diagnóstico de permissões: tenta uma leitura em cada área e devolve o código HTTP de cada uma.
export async function diagnosticarPermissoes() {
  const accessToken = await obterAccessTokenValido();
  const testes = ["/nfe?limite=1", "/contatos?limite=1", "/produtos?limite=1"];
  const resultado = [];
  for (const caminho of testes) {
    try {
      await chamarBling(accessToken, caminho);
      resultado.push({ caminho: caminho.split("?")[0], ok: true });
    } catch (err) {
      resultado.push({ caminho: caminho.split("?")[0], ok: false, erro: err.message });
    }
  }
  // IP público do servidor (dinâmico na Vercel): o suporte do Bling costuma pedir para liberar/investigar.
  try {
    const r = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(5000) });
    const { ip } = await r.json();
    resultado.push({ caminho: "IP de saída do servidor", ok: true, detalhe: ip });
  } catch {
    resultado.push({ caminho: "IP de saída do servidor", ok: false, erro: "não foi possível obter" });
  }
  return resultado;
}
