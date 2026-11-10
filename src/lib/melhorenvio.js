// Cliente do Melhor Envio — SÓ pode ser importado em código de servidor.
// Guarda o access_token/refresh_token na tabela `integracoes`, que só
// a service_role consegue ler (nenhuma policy de RLS libera acesso).
import { createClient } from "@supabase/supabase-js";

const INTEGRACAO_ID = "melhor_envio";

export const ESCOPOS = [
  "shipping-calculate",
  "shipping-generate",
  "shipping-tracking",
  "shipping-checkout",
  "shipping-print",
  "orders-read",
  "cart-read",
  "cart-write",
].join(" ");

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function urlAutorizacao(state) {
  const params = new URLSearchParams({
    client_id: process.env.MELHORENVIO_CLIENT_ID,
    redirect_uri: process.env.MELHORENVIO_REDIRECT_URI,
    response_type: "code",
    // shipping-checkout paga a etiqueta, shipping-print baixa o PDF e orders-read lê o envio e o rastreio.
    scope: ESCOPOS,
    state,
  });
  return `${process.env.MELHORENVIO_BASE_URL}/oauth/authorize?${params.toString()}`;
}

async function trocarCodigoPorToken(code) {
  const res = await fetch(`${process.env.MELHORENVIO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.MELHORENVIO_CLIENT_ID,
      client_secret: process.env.MELHORENVIO_CLIENT_SECRET,
      redirect_uri: process.env.MELHORENVIO_REDIRECT_URI,
      code,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Erro ao trocar código de autorização por token.");
  }
  return data;
}

async function renovarToken(refreshToken) {
  const res = await fetch(`${process.env.MELHORENVIO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.MELHORENVIO_CLIENT_ID,
      client_secret: process.env.MELHORENVIO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Erro ao renovar token do Melhor Envio.");
  }
  return data;
}

async function salvarTokens(tokenResponse) {
  const supabase = supabaseAdmin();
  const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000; // margem de 1 min
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
  const { data } = await supabase.from("integracoes").select("dados, updated_at").eq("id", INTEGRACAO_ID).maybeSingle();
  if (!data) return { conectado: false };
  return { conectado: true, conectadoEm: data.updated_at };
}

async function obterAccessTokenValido() {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("integracoes").select("dados").eq("id", INTEGRACAO_ID).maybeSingle();

  if (!data) {
    throw new Error("Melhor Envio ainda não foi conectado. Conecte em Admin → Frete.");
  }

  const { access_token, refresh_token, expires_at } = data.dados;

  if (Date.now() < expires_at) {
    return access_token;
  }

  const novosTokens = await renovarToken(refresh_token);
  await salvarTokens(novosTokens);
  return novosTokens.access_token;
}

// Chamada autenticada à API do Melhor Envio (carrinho, checkout, etiqueta, rastreio...).
// O erro leva o texto do Melhor Envio (e os campos recusados) para o painel mostrar ao lojista.
export async function chamarMelhorEnvio(caminho, { method = "GET", body } = {}) {
  const accessToken = await obterAccessTokenValido();
  const res = await fetch(`${process.env.MELHORENVIO_BASE_URL}/api/v2${caminho}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Curadoria da Mesa (hebertdev82@gmail.com)",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const campos = data?.errors
      ? Object.entries(data.errors).map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`).join("; ")
      : "";
    const texto = [data?.message || data?.error || `Melhor Envio erro ${res.status}`, campos].filter(Boolean).join(" — ");
    // 401/403: o token não tem a permissão (escopo) dessa ação. Reconectar renova as permissões.
    const dica = res.status === 401 || res.status === 403
      ? " Falta permissão na conexão com o Melhor Envio: reconecte em Admin > Frete (botão Reconectar) e tente de novo."
      : "";
    const erro = new Error(texto + dica);
    erro.status = res.status;
    throw erro;
  }
  return data;
}

/**
 * Calcula opções de frete para um destino, a partir do CEP de origem
 * (loja) e uma lista de produtos (peso/dimensões).
 */
export async function calcularFrete({ cepDestino, produtos }) {
  const accessToken = await obterAccessTokenValido();

  if (!process.env.MELHORENVIO_CEP_ORIGEM) {
    throw new Error("MELHORENVIO_CEP_ORIGEM não configurado (CEP de onde os produtos são enviados).");
  }

  const res = await fetch(`${process.env.MELHORENVIO_BASE_URL}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Curadoria da Mesa (hebertdev82@gmail.com)",
    },
    body: JSON.stringify({
      from: { postal_code: onlyDigits(process.env.MELHORENVIO_CEP_ORIGEM) },
      to: { postal_code: onlyDigits(cepDestino) },
      products: produtos,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const erro = new Error(data?.message || "Erro ao calcular frete no Melhor Envio.");
    erro.status = res.status; // 422 = o Melhor Envio recusou os dados (ex.: CEP inexistente)
    throw erro;
  }
  return data;
}

const onlyDigits = (value) => (value || "").replace(/\D/g, "");
