// ATENÇÃO: server-only. Nunca importe em componentes client.
import { formatBRL } from "./loja";
import { buscarDadosPedido, escaparHtml, modalidadeDoPedido } from "./email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.curadoriadamesa.com.br";

const ROTULO_MODALIDADE = {
  retirada: "Retirada na loja",
  motoboy: "Motoboy",
  entrega: "Entrega (Correios/transportadora)",
};

function destinos() {
  return (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(/[,;\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

// Mensagem curta para o celular do lojista. Nome e itens vêm de campos digitados: sempre escapados.
// O endereço completo fica só no painel admin.
export function textoNovoPedido(order, pago) {
  const itens = (order.order_items ?? [])
    .map((i) => `• ${i.quantidade}× ${escaparHtml(i.titulo)}`)
    .join("\n");
  const cliente = escaparHtml(order.profiles?.full_name || "Cliente");
  const telefone = order.profiles?.phone ? ` · ${escaparHtml(order.profiles.phone)}` : "";
  const desconto = Number(order.desconto) > 0
    ? `\nDesconto${order.coupon_code ? ` (${escaparHtml(order.coupon_code)})` : ""}: -${formatBRL(order.desconto)}`
    : "";

  return [
    pago ? "✅ <b>Pedido pago</b>" : "🛒 <b>Novo pedido</b> (aguardando pagamento)",
    `#${order.id.slice(0, 8)} · <b>${formatBRL(order.total)}</b>`,
    "",
    `${cliente}${telefone}`,
    `Modalidade: ${ROTULO_MODALIDADE[modalidadeDoPedido(order)]}`,
    "",
    itens,
    `Frete: ${formatBRL(order.frete)}${desconto}`,
    "",
    `<a href="${SITE}/admin/pedidos">Abrir no painel</a>`,
  ].join("\n");
}

// Aviso de reposição: produtos que ficaram no estoque mínimo (ou menos) depois de uma venda.
export function textoEstoqueBaixo(produtos) {
  const linhas = produtos.map((p) =>
    Number(p.estoque) === 0
      ? `• ${escaparHtml(p.produto)} — <b>esgotado</b> (mínimo ${Number(p.estoque_minimo)})`
      : `• ${escaparHtml(p.produto)} — restam <b>${Number(p.estoque)}</b> (mínimo ${Number(p.estoque_minimo)})`
  );
  return [
    "⚠️ <b>Estoque baixo</b>",
    produtos.length === 1 ? "Este produto chegou à quantidade mínima:" : "Estes produtos chegaram à quantidade mínima:",
    "",
    ...linhas,
    "",
    `<a href="${SITE}/admin/produtos">Repor no painel</a>`,
  ].join("\n");
}

async function enviarMensagem(chatId, texto) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Telegram error ${res.status}: ${await res.text()}`);
}

// Aviso opcional de novo pedido (criação e pagamento). Só envia se TELEGRAM_BOT_TOKEN e
// TELEGRAM_CHAT_ID (um ou mais ids separados por vírgula) estiverem definidos. Nunca lança erro.
export async function enviarTelegramNovoPedido(orderId, { pago = true } = {}) {
  const chats = destinos();
  if (!process.env.TELEGRAM_BOT_TOKEN || chats.length === 0) return;

  try {
    const dados = await buscarDadosPedido(orderId);
    if (!dados) return;
    const texto = textoNovoPedido(dados.order, pago);

    await Promise.all(
      chats.map((chat) =>
        enviarMensagem(chat, texto).catch((err) =>
          console.error(`Erro ao enviar aviso no Telegram (chat ${chat}):`, err.message)
        )
      )
    );
  } catch (err) {
    console.error("Erro ao montar aviso do Telegram:", err);
  }
}

// Aviso de estoque baixo no Telegram. Mesma regra do aviso de pedido: só envia com token e chat
// configurados e nunca lança erro (a venda já foi concluída).
export async function enviarTelegramEstoqueBaixo(produtos) {
  const chats = destinos();
  if (!process.env.TELEGRAM_BOT_TOKEN || chats.length === 0 || !produtos?.length) return;

  const texto = textoEstoqueBaixo(produtos);
  await Promise.all(
    chats.map((chat) =>
      enviarMensagem(chat, texto).catch((err) =>
        console.error(`Erro ao enviar aviso de estoque no Telegram (chat ${chat}):`, err.message)
      )
    )
  );
}
