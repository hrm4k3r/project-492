// ATENÇÃO: server-only. Nunca importe em componentes client.
import { createClient } from "@supabase/supabase-js";

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
  return { conectado: true, conectadoEm: data.updated_at };
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

/**
 * Emite NF-e no Bling para o pedido informado.
 * Lança erro se o pedido não tiver dados suficientes.
 */
export async function emitirNFe(orderId) {
  const supabase = supabaseAdmin();

  // Busca pedido com itens, endereço e perfil
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `id, total, subtotal, frete, desconto, created_at,
       order_items ( id, titulo, preco_unitario, quantidade, subtotal, produto_id,
         produtos ( ncm, unidade, cfop )
       ),
       addresses ( street, number, complement, neighborhood, city, state, cep ),
       profiles ( full_name, documento )`
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error(`Pedido ${orderId} não encontrado.`);

  const { addresses: address, profiles: profile, order_items: itens } = order;

  if (!address) throw new Error("Pedido sem endereço de entrega.");
  if (!profile?.documento) throw new Error("Cliente sem CPF/CNPJ cadastrado (necessário para NF-e).");

  const itensSemNcm = itens.filter((i) => !i.produtos?.ncm);
  if (itensSemNcm.length > 0) {
    const nomes = itensSemNcm.map((i) => i.titulo).join(", ");
    throw new Error(`Produto(s) sem NCM: ${nomes}. Preencha o NCM antes de emitir a NF-e.`);
  }

  const estadoOrigem = process.env.BLING_ESTADO_ORIGEM ?? "SP";
  const docLimpo = profile.documento.replace(/\D/g, "");
  const tipoPessoa = docLimpo.length === 14 ? "J" : "F";

  const payload = {
    tipo: 1,
    finalidade: 1,
    naturezaOperacao: "VENDA DE MERCADORIA AO CONSUMIDOR",
    dataOperacao: new Date(order.created_at).toISOString().replace("T", " ").slice(0, 19),
    contato: {
      nome: profile.full_name || "Cliente",
      tipoPessoa,
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
        formaPagamento: { id: 17 }, // 17 = Pix no Bling
      },
    ],
    transporte: {
      fretePorConta: 1, // 0 = emitente, 1 = destinatário
      frete: Number(order.frete),
    },
  };

  const accessToken = await obterAccessTokenValido();
  const res = await fetch(`${BLING_BASE}/nfe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? data?.error?.fields?.map((f) => f.msg).join("; ") ?? `Bling NF-e erro ${res.status}`;
    throw new Error(msg);
  }

  return data?.data ?? data;
}
