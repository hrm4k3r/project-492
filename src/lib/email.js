import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { formatBRL } from "./loja";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `Curadoria da Mesa <${process.env.RESEND_FROM_EMAIL}>`;

const STATUS_CONFIG = {
  pago:       { assunto: "Pagamento confirmado",          titulo: "Pagamento confirmado!", cor: "#4A7C59" },
  preparando: { assunto: "Preparando o seu pedido",       titulo: "Estamos preparando o seu pedido", cor: "#C9A36A" },
  enviado:    { assunto: "Seu pedido foi enviado",         titulo: "Seu pedido está a caminho!", cor: "#C9A36A" },
  entregue:   { assunto: "Seu pedido foi entregue",        titulo: "Pedido entregue!", cor: "#4A7C59" },
  cancelado:  { assunto: "Seu pedido foi cancelado",       titulo: "Pedido cancelado", cor: "#B85C38" },
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function buscarDadosPedido(orderId) {
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
              <p style="margin:0 0 24px;font-size:15px;color:#5A2A14;">Olá, ${nome}!</p>
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
        ${item.quantidade}× ${item.titulo}
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
    ? `<p style="margin:4px 0;font-size:13px;color:#5A2A14;">📦 Retirada na loja</p>`
    : addr
      ? `<p style="margin:4px 0;font-size:13px;color:#5A2A14;">
           📍 ${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ""} — ${addr.neighborhood}, ${addr.city}/${addr.state} — CEP ${addr.cep}
           ${order.frete_servico ? `<br/><span style="color:#C9A36A;">${order.frete_servico}</span>` : ""}
         </p>`
      : "";

  const desconto = Number(order.desconto) > 0
    ? `<tr>
         <td style="padding:4px 0;font-size:13px;color:#5A2A14;">Desconto${order.coupon_code ? ` (${order.coupon_code})` : ""}</td>
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
  const cfg = STATUS_CONFIG[status];
  const numeroShort = `#${order.id.slice(0, 8)}`;
  const mensagem = STATUS_MENSAGEM[status] ?? "";

  const conteudo = `
    <p style="margin:0 0 20px;font-size:15px;color:#5A2A14;">${mensagem}</p>
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

    await resend.emails.send({
      from: FROM,
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
    const cfg = STATUS_CONFIG[status];
    const numeroShort = `#${order.id.slice(0, 8)}`;

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${cfg.assunto} — Pedido ${numeroShort}`,
      html: templateAtualizacaoStatus(order, nome, status),
    });
  } catch (err) {
    console.error("Erro ao enviar email de status:", err);
  }
}
