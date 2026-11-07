import { createClient } from "@supabase/supabase-js";
import { formatBRL, LOJA } from "./loja";
import { MOTOBOY_SERVICO } from "./motoboy";
import { linkRastreio } from "./rastreio";

const FROM = `Curadoria da Mesa <${process.env.RESEND_FROM_EMAIL}>`;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.curadoriadamesa.com.br";

async function enviar({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

const STATUS_CONFIG = {
  pago:       { assunto: "Pagamento confirmado",          titulo: "Pagamento confirmado!", cor: "#4A7C59" },
  preparando: { assunto: "Preparando o seu pedido",       titulo: "Estamos preparando o seu pedido", cor: "#C9A36A" },
  enviado:    { assunto: "Seu pedido foi enviado",         titulo: "Seu pedido está a caminho!", cor: "#C9A36A" },
  entregue:   { assunto: "Seu pedido foi entregue",        titulo: "Pedido entregue!", cor: "#4A7C59" },
  cancelado:  { assunto: "Seu pedido foi cancelado",       titulo: "Pedido cancelado", cor: "#B85C38" },
};

// "retirada" | "motoboy" | "entrega" (Correios/transportadora), a partir do serviço gravado no pedido.
export function modalidadeDoPedido(order) {
  if (order?.frete_servico === "Retirada no local") return "retirada";
  if (order?.frete_servico === MOTOBOY_SERVICO) return "motoboy";
  return "entrega";
}

// Título, assunto e texto de cada status mudam conforme a modalidade:
// "saiu para entrega" não faz sentido para quem vai retirar na loja.
export function textosDoStatus(status, modalidade) {
  const base = STATUS_CONFIG[status];
  if (!base) return null;

  const porModalidade = {
    enviado: {
      retirada: {
        assunto: "Seu pedido está pronto para retirada",
        titulo: "Seu pedido está pronto para retirada!",
        mensagem: `Já separamos tudo. Você pode retirar na loja: ${LOJA.endereco}. Leve um documento com foto e o número do pedido.`,
      },
      motoboy: {
        assunto: "Seu pedido saiu com o motoboy",
        titulo: "Seu pedido saiu com o motoboy!",
        mensagem: "O motoboy já está a caminho do seu endereço. Fique atento ao telefone e aguarde a entrega.",
      },
      entrega: {
        mensagem: "Seu pedido saiu para entrega. Fique de olho no rastreamento e aguarde!",
      },
    },
    entregue: {
      retirada: {
        assunto: "Retirada concluída",
        titulo: "Retirada concluída!",
        mensagem: "Obrigado por retirar o seu pedido. Esperamos que você aproveite muito!",
      },
    },
    preparando: {
      retirada: {
        mensagem: "Recebemos a confirmação do pagamento e já estamos separando os produtos. Avisaremos quando estiver pronto para retirada.",
      },
    },
  };

  const extra = porModalidade[status]?.[modalidade] ?? {};
  return {
    assunto: extra.assunto ?? base.assunto,
    titulo: extra.titulo ?? base.titulo,
    cor: base.cor,
    mensagem: extra.mensagem ?? STATUS_MENSAGEM[status] ?? "",
  };
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function buscarDadosPedido(orderId) {
  const db = supabaseAdmin();

  const { data: order } = await db
    .from("orders")
    .select("*, order_items(*), profiles(full_name, phone), addresses(*)")
    .eq("id", orderId)
    .single();

  if (!order) return null;

  const { data: authUser } = await db.auth.admin.getUserById(order.profile_id);
  const email = authUser?.user?.email;

  return { order, email };
}

// Nome, endereço e títulos vêm de campos digitados por clientes/admin: nunca entram crus no HTML.
export function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function primeiroNome(nomeCompleto) {
  return (nomeCompleto ?? "").split(" ")[0] || "cliente";
}

function htmlBase({ nome, titulo, corTitulo, conteudo, rodape }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#F8F1E4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F1E4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#5A2A14;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#F7E3C5;letter-spacing:0.03em;">
                Curadoria da Mesa
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:32px 36px;">
              <h1 style="margin:0 0 8px;font-size:24px;color:${corTitulo};">${titulo}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5A2A14;">Olá, ${escaparHtml(nome)}!</p>
              ${conteudo}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#5A2A14;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#F7E3C5;opacity:0.7;">${rodape}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function linhasItens(items) {
  if (!items?.length) return "";
  return items.map((item) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#5A2A14;border-bottom:1px solid #F7E3C5;">
        ${item.quantidade}× ${escaparHtml(item.titulo)}
      </td>
      <td style="padding:8px 0;font-size:14px;color:#5A2A14;border-bottom:1px solid #F7E3C5;text-align:right;white-space:nowrap;">
        ${formatBRL(item.subtotal)}
      </td>
    </tr>`).join("");
}

function tabelaResumo(order) {
  const retirada = order.frete_servico === "Retirada no local";
  const addr = order.addresses;

  const entrega = retirada
    ? `<p style="margin:4px 0;font-size:13px;color:#5A2A14;">📦 Retirada na loja<br/>${escaparHtml(LOJA.endereco)}</p>`
    : addr
      ? `<p style="margin:4px 0;font-size:13px;color:#5A2A14;">
           📍 ${escaparHtml(addr.street)}, ${escaparHtml(addr.number)}${addr.complement ? ` - ${escaparHtml(addr.complement)}` : ""} — ${escaparHtml(addr.neighborhood)}, ${escaparHtml(addr.city)}/${escaparHtml(addr.state)} — CEP ${escaparHtml(addr.cep)}
           ${order.frete_servico ? `<br/><span style="color:#C9A36A;">${escaparHtml(order.frete_servico)}</span>` : ""}
         </p>`
      : "";

  const desconto = Number(order.desconto) > 0
    ? `<tr>
         <td style="padding:4px 0;font-size:13px;color:#5A2A14;">Desconto${order.coupon_code ? ` (${escaparHtml(order.coupon_code)})` : ""}</td>
         <td style="padding:4px 0;font-size:13px;color:#4A7C59;text-align:right;">-${formatBRL(order.desconto)}</td>
       </tr>`
    : "";

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${linhasItens(order.order_items)}
      <tr><td colspan="2" style="padding:4px 0;"></td></tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#888;">Subtotal</td>
        <td style="padding:4px 0;font-size:13px;color:#888;text-align:right;">${formatBRL(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#888;">Frete</td>
        <td style="padding:4px 0;font-size:13px;color:#888;text-align:right;">${formatBRL(order.frete)}</td>
      </tr>
      ${desconto}
      <tr>
        <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#5A2A14;border-top:2px solid #F7E3C5;">Total</td>
        <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#B85C38;text-align:right;border-top:2px solid #F7E3C5;">${formatBRL(order.total)}</td>
      </tr>
    </table>
    <div style="background:#F8F1E4;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#5A2A14;text-transform:uppercase;letter-spacing:0.08em;">Entrega</p>
      ${entrega}
    </div>`;
}

function templateConfirmacao(order, nome) {
  const numeroShort = `#${order.id.slice(0, 8)}`;

  const conteudo = `
    <div style="background:#F0FAF3;border-left:4px solid #4A7C59;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#4A7C59;">
        ✅ Seu pagamento foi confirmado. Número do pedido: <strong>${numeroShort}</strong>
      </p>
    </div>
    ${tabelaResumo(order)}
    <p style="margin:0;font-size:13px;color:#888;">
      Em caso de dúvidas, entre em contato conosco pelo WhatsApp ou responda este e-mail.
    </p>`;

  return htmlBase({
    nome,
    titulo: "Pagamento confirmado!",
    corTitulo: "#4A7C59",
    conteudo,
    rodape: `Pedido ${numeroShort} · Curadoria da Mesa`,
  });
}

const STATUS_MENSAGEM = {
  preparando: "Recebemos a confirmação do pagamento e já estamos separando os produtos com carinho para você.",
  enviado:    "Seu pedido saiu para entrega. Fique de olho no rastreamento e aguarde!",
  entregue:   "Esperamos que você aproveite muito. Obrigado por escolher a Curadoria da Mesa!",
  cancelado:  "Seu pedido foi cancelado. Se tiver dúvidas ou precisar de ajuda, entre em contato conosco.",
};

function templateAtualizacaoStatus(order, nome, status) {
  const modalidade = modalidadeDoPedido(order);
  const cfg = textosDoStatus(status, modalidade);
  const numeroShort = `#${order.id.slice(0, 8)}`;

  const rastreio = status === "enviado" && modalidade === "entrega" && order.codigo_rastreio
    ? `<div style="background:#F8F1E4;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
         <p style="margin:0;font-size:13px;color:#888;">Código de rastreio</p>
         <p style="margin:4px 0 0;font-size:18px;font-weight:700;letter-spacing:0.05em;color:#5A2A14;">${escaparHtml(order.codigo_rastreio)}</p>
         ${linkRastreio(order.codigo_rastreio) ? `<p style="margin:10px 0 0;"><a href="${linkRastreio(order.codigo_rastreio)}" style="color:#B85C38;font-size:14px;">Rastrear minha encomenda</a></p>` : ""}
       </div>`
    : "";

  const conteudo = `
    <p style="margin:0 0 20px;font-size:15px;color:#5A2A14;">${escaparHtml(cfg.mensagem)}</p>
    ${rastreio}
    <div style="background:#F8F1E4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#888;">Pedido</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#5A2A14;">${numeroShort}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#888;">Total: <strong style="color:#5A2A14;">${formatBRL(order.total)}</strong></p>
    </div>
    <p style="margin:0;font-size:13px;color:#888;">
      Em caso de dúvidas, entre em contato conosco pelo WhatsApp ou responda este e-mail.
    </p>`;

  return htmlBase({
    nome,
    titulo: cfg.titulo,
    corTitulo: cfg.cor,
    conteudo,
    rodape: `Pedido ${numeroShort} · Curadoria da Mesa`,
  });
}

export async function enviarEmailConfirmacaoPedido(orderId) {
  try {
    const dados = await buscarDadosPedido(orderId);
    if (!dados?.email) {
      console.warn("Email: sem e-mail para pedido", orderId);
      return;
    }

    const { order, email } = dados;
    const nome = primeiroNome(order.profiles?.full_name);
    const numeroShort = `#${order.id.slice(0, 8)}`;

    await enviar({
      to: email,
      subject: `Pagamento confirmado — Pedido ${numeroShort}`,
      html: templateConfirmacao(order, nome),
    });
  } catch (err) {
    console.error("Erro ao enviar email de confirmação:", err);
  }
}

export async function enviarEmailAtualizacaoStatus(orderId, status) {
  if (!STATUS_CONFIG[status] || status === "pago" || status === "pendente") return;

  try {
    const dados = await buscarDadosPedido(orderId);
    if (!dados?.email) {
      console.warn("Email: sem e-mail para pedido", orderId);
      return;
    }

    const { order, email } = dados;
    const nome = primeiroNome(order.profiles?.full_name);
    const cfg = textosDoStatus(status, modalidadeDoPedido(order));
    const numeroShort = `#${order.id.slice(0, 8)}`;

    await enviar({
      to: email,
      subject: `${cfg.assunto} — Pedido ${numeroShort}`,
      html: templateAtualizacaoStatus(order, nome, status),
    });
  } catch (err) {
    console.error("Erro ao enviar email de status:", err);
  }
}

function templatePedidoRecebido(order, nome) {
  const numeroShort = `#${order.id.slice(0, 8)}`;
  const link = `${SITE}/pagamento/${order.id}`;

  const conteudo = `
    <div style="background:#FFF8E8;border-left:4px solid #C9A36A;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#5A2A14;">
        Recebemos o seu pedido <strong>${numeroShort}</strong>. Ele será separado assim que o pagamento for confirmado.
      </p>
    </div>
    ${tabelaResumo(order)}
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${link}" style="display:inline-block;background:#B85C38;color:#F8F1E4;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:999px;">
        Ir para o pagamento
      </a>
    </p>
    <p style="margin:0;font-size:13px;color:#888;">
      Se você já pagou, pode ignorar este e-mail: avisaremos assim que o pagamento for confirmado.
      Em caso de dúvidas, fale conosco pelo WhatsApp.
    </p>`;

  return htmlBase({
    nome,
    titulo: "Recebemos o seu pedido",
    corTitulo: "#C9A36A",
    conteudo,
    rodape: `Pedido ${numeroShort} · Curadoria da Mesa`,
  });
}

// Enviado ao criar o pedido, enquanto o pagamento ainda não foi confirmado.
export async function enviarEmailPedidoRecebido(orderId) {
  try {
    const dados = await buscarDadosPedido(orderId);
    if (!dados?.email) {
      console.warn("Email: sem e-mail para pedido", orderId);
      return;
    }

    const { order, email } = dados;
    await enviar({
      to: email,
      subject: `Recebemos o seu pedido — #${order.id.slice(0, 8)}`,
      html: templatePedidoRecebido(order, primeiroNome(order.profiles?.full_name)),
    });
  } catch (err) {
    console.error("Erro ao enviar email de pedido recebido:", err);
  }
}

function templateAvisoLoja(order, pago = true) {
  const numeroShort = `#${order.id.slice(0, 8)}`;
  const cliente = order.profiles?.full_name || "Cliente";
  const modalidade = modalidadeDoPedido(order);
  const rotulo = { retirada: "Retirada na loja", motoboy: "Motoboy", entrega: "Entrega (Correios/transportadora)" }[modalidade];

  const conteudo = `
    <p style="margin:0 0 20px;font-size:15px;color:#5A2A14;">
      <strong>${escaparHtml(cliente)}</strong>${order.profiles?.phone ? ` · ${escaparHtml(order.profiles.phone)}` : ""}<br/>
      Modalidade: <strong>${rotulo}</strong>
    </p>
    ${tabelaResumo(order)}
    <p style="margin:0;font-size:13px;color:#888;">
      Veja e atualize o pedido em <a href="${SITE}/admin/pedidos" style="color:#B85C38;">Admin &gt; Pedidos</a>.
    </p>`;

  return htmlBase({
    nome: "equipe",
    titulo: pago ? `Novo pedido pago ${numeroShort}` : `Novo pedido ${numeroShort} (aguardando pagamento)`,
    corTitulo: pago ? "#4A7C59" : "#C9A36A",
    conteudo,
    rodape: `Pedido ${numeroShort} · Curadoria da Mesa`,
  });
}

// Lista de e-mails do aviso à loja. Aceita vírgula, ponto e vírgula, espaço ou quebra de linha
// ("a@x.com; b@y.com" já derrubou todos os avisos por virar um único endereço inválido).
export function destinosDoAviso(valor = process.env.EMAIL_AVISO_LOJA) {
  return String(valor ?? "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
}

// Aviso interno de novo pedido: na criação ({ pago: false }) e quando o pagamento é confirmado.
// Só envia se EMAIL_AVISO_LOJA estiver definido (um ou mais e-mails separados por vírgula).
export async function enviarEmailNovoPedidoParaLoja(orderId, { pago = true } = {}) {
  const destinos = destinosDoAviso();
  if (destinos.length === 0) return;

  try {
    const dados = await buscarDadosPedido(orderId);
    if (!dados) return;

    const { order } = dados;
    await enviar({
      to: destinos,
      subject: `${pago ? "Novo pedido pago" : "Novo pedido (aguardando pagamento)"} — #${order.id.slice(0, 8)} (${formatBRL(order.total)})`,
      html: templateAvisoLoja(order, pago),
    });
  } catch (err) {
    console.error("Erro ao enviar aviso de novo pedido para a loja:", err);
  }
}

// Aviso de reposição: produtos que ficaram no estoque mínimo (ou menos) depois de um pedido pago.
export function templateEstoqueBaixo(produtos) {
  const linhas = produtos.map((p) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#5A2A14;border-bottom:1px solid #F7E3C5;">${escaparHtml(p.produto)}</td>
      <td style="padding:8px 0;font-size:14px;text-align:right;white-space:nowrap;border-bottom:1px solid #F7E3C5;color:${Number(p.estoque) === 0 ? "#B85C38" : "#5A2A14"};">
        ${Number(p.estoque) === 0 ? "<strong>Esgotado</strong>" : `restam <strong>${Number(p.estoque)}</strong>`}
        <span style="color:#888;"> · mínimo ${Number(p.estoque_minimo)}</span>
      </td>
    </tr>`).join("");

  return htmlBase({
    nome: "equipe",
    titulo: produtos.length === 1 ? "Hora de repor um produto" : "Hora de repor alguns produtos",
    corTitulo: "#B85C38",
    conteudo: `
      <p style="margin:0 0 16px;font-size:15px;color:#5A2A14;">
        Depois da última venda, ${produtos.length === 1 ? "este produto chegou" : "estes produtos chegaram"} à quantidade mínima de estoque:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${linhas}</table>
      <p style="margin:0;font-size:13px;color:#888;">
        Atualize o estoque em <a href="${SITE}/admin/produtos" style="color:#B85C38;">Admin &gt; Produtos</a>.
      </p>`,
    rodape: "Aviso de estoque · Curadoria da Mesa",
  });
}

// Só envia se EMAIL_AVISO_LOJA estiver definido. Nunca lança erro.
export async function enviarEmailEstoqueBaixo(produtos) {
  const destinos = destinosDoAviso();
  if (destinos.length === 0 || !produtos?.length) return;

  try {
    await enviar({
      to: destinos,
      subject: produtos.length === 1
        ? `Estoque baixo — ${produtos[0].produto}`
        : `Estoque baixo — ${produtos.length} produtos para repor`,
      html: templateEstoqueBaixo(produtos),
    });
  } catch (err) {
    console.error("Erro ao enviar aviso de estoque baixo:", err);
  }
}
