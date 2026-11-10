// ATENÇÃO: server-only. Acompanha a entrega dos pedidos que têm etiqueta do Melhor Envio e atualiza o
// status do pedido sozinho: etiqueta gerada -> preparando, postado -> enviado, entregue -> entregue.
// O status só AVANÇA (nunca volta), e cada mudança envia o e-mail de status uma única vez.
import { chamarMelhorEnvio } from "./melhorenvio";
import { enviarEmailAtualizacaoStatus } from "./email";

const ORDEM = ["pago", "preparando", "enviado", "entregue"];

// Status do envio no Melhor Envio -> status do pedido.
const DO_MELHOR_ENVIO = {
  paid: "preparando",
  released: "preparando",
  generated: "preparando",
  posted: "enviado",
  delivered: "entregue",
};

// Pura (testável): qual o novo status do pedido, ou null se não há mudança (ou seria voltar atrás).
export function proximoStatus(atual, statusEnvio) {
  const alvo = DO_MELHOR_ENVIO[String(statusEnvio ?? "").toLowerCase()];
  if (!alvo) return null; // cancelado, não entregue, pendente...: o lojista resolve à mão
  const de = ORDEM.indexOf(atual);
  const para = ORDEM.indexOf(alvo);
  if (de < 0 || para <= de) return null;
  return alvo;
}

const dataValida = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

// Consulta o Melhor Envio e atualiza os pedidos com etiqueta gerada que ainda não foram entregues.
// Devolve { verificados, atualizados: [{ id, de, para }], erros }.
export async function sincronizarEntregas(db) {
  const { data: pedidos } = await db
    .from("orders")
    .select("id, status, codigo_rastreio, etiqueta_id, enviado_em")
    .eq("etiqueta_status", "gerada")
    .in("status", ["pago", "preparando", "enviado"]);

  const lista = (pedidos ?? []).filter((p) => p.etiqueta_id).slice(0, 100);
  const resultado = { verificados: lista.length, atualizados: [], erros: 0 };
  if (lista.length === 0) return resultado;

  // Uma chamada só para todos os envios.
  const rastreios = await chamarMelhorEnvio("/me/shipment/tracking", {
    method: "POST",
    body: { orders: lista.map((p) => p.etiqueta_id) },
  });

  for (const pedido of lista) {
    const envio = rastreios?.[pedido.etiqueta_id];
    if (!envio) continue;

    const statusAntes = pedido.status;
    const novo = proximoStatus(statusAntes, envio.status);
    const codigo = String(envio.tracking ?? "").trim();
    const mudancas = {};
    if (codigo && codigo !== pedido.codigo_rastreio) mudancas.codigo_rastreio = codigo;
    if (novo === "enviado" || novo === "entregue") {
      mudancas.enviado_em = pedido.enviado_em ?? dataValida(envio.posted_at) ?? new Date().toISOString();
    }
    if (novo === "entregue") mudancas.entregue_em = dataValida(envio.delivered_at) ?? new Date().toISOString();
    if (novo) mudancas.status = novo;
    if (Object.keys(mudancas).length === 0) continue;

    try {
      // Condicional ao status que lemos: se o lojista mudou à mão nesse meio tempo, ou a verificação
      // rodou duas vezes ao mesmo tempo, só quem de fato mudou o status envia o e-mail.
      const { data: gravado, error } = await db
        .from("orders")
        .update(mudancas)
        .eq("id", pedido.id)
        .eq("status", statusAntes)
        .select("id");
      if (error) throw error;
      if (!gravado?.length) continue;

      if (novo) {
        resultado.atualizados.push({ id: pedido.id, de: statusAntes, para: novo });
        await Promise.resolve(enviarEmailAtualizacaoStatus(pedido.id, novo)).catch(console.error);
      }
    } catch (err) {
      resultado.erros += 1;
      console.error(`Sincronização de entrega do pedido ${pedido.id}:`, err.message);
    }
  }

  return resultado;
}
