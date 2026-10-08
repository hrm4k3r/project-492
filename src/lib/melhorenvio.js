// Cliente do Melhor Envio — SÓ pode ser importado em código de servidor.
// Guarda o access_token/refresh_token na tabela `integracoes`, que só
// a service_role consegue ler (nenhuma policy de RLS libera acesso).
import { createClient } from "@supabase/supabase-js";

const INTEGRACAO_ID = "melhor_envio";

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function urlAutorizacao(state) {
  const params = new URLSearchParams({
    client_id: process.env.MELHORENVIO_CLIENT_ID,
    redirect_uri: process.env.MELHORENVIO_REDIRECT_URI,
    response_type: "code",
    scope: "shipping-calculate shipping-generate shipping-tracking cart-read cart-write",
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

/**
 * Calcula opções de frete para um destino, a partir do CEP de origem
 * (fazenda) e uma lista de produtos (peso/dimensões).
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
      "User-Agent": "Fazenda Santo Antônio (hebertdev82@gmail.com)",
    },
    body: JSON.stringify({
      from: { postal_code: onlyDigits(process.env.MELHORENVIO_CEP_ORIGEM) },
      to: { postal_code: onlyDigits(cepDestino) },
      products: produtos,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Erro ao calcular frete no Melhor Envio.");
  }
  return data;
}

const onlyDigits = (value) => (value || "").replace(/\D/g, "");
