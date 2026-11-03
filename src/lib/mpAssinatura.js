// ATENÇÃO: server-only. Valida a assinatura (x-signature) das notificações do Mercado Pago.
import { createHmac, timingSafeEqual } from "crypto";

// Retorna true se a assinatura confere. Sem MERCADOPAGO_WEBHOOK_SECRET configurado a
// validação é pulada (aviso no log): o webhook continua protegido por reconsultar o
// pagamento na API do MP, mas defina o segredo para fechar de vez.
export function assinaturaValida(request, dataId) {
  const segredo = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!segredo) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET não definido: assinatura do webhook não verificada.");
    return true;
  }

  const assinatura = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const { ts, v1 } = partes;
  if (!ts || !v1 || !dataId) return false;

  // Ids alfanuméricos entram em minúsculas no manifesto, conforme a documentação do MP.
  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");

  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
