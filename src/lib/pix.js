// Desconto para quem paga no Pix. O pedido nasce com o total "cheio" (o que o cartão paga) e guarda em
// orders.desconto_pix quanto o Pix economiza. Só quando um pagamento Pix é confirmado o servidor aplica o
// desconto ao total (lib/pedidos.js). O desconto incide sobre os produtos já com o cupom, sem o frete.

const arred = (n) => Math.round(n * 100) / 100;

export const PIX_PERCENTUAL_PADRAO = 5;

// Percentual válido de 0 a 100; qualquer outra coisa vira 0 (sem desconto), exceto valor ausente = padrão.
export function normalizarPercentualPix(valor) {
  if (valor === undefined || valor === null || valor === "") return PIX_PERCENTUAL_PADRAO;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
}

export function calcularDescontoPix({ subtotal, desconto = 0, percentual }) {
  const base = Math.max(0, Number(subtotal) - Number(desconto || 0));
  const pct = normalizarPercentualPix(percentual);
  return pct > 0 ? arred((base * pct) / 100) : 0;
}

// Quanto o cliente paga em cada meio, a partir do pedido gravado.
export function valorNoPix(order) {
  return arred(Math.max(0, Number(order.total) - Number(order.desconto_pix ?? 0)));
}

// Valor esperado (em centavos) de um pagamento confirmado no Mercado Pago: o Pix usa o valor com desconto.
export function centavosEsperados(order, payment) {
  const pix = payment?.payment_method_id === "pix";
  return Math.round((pix ? valorNoPix(order) : Number(order.total)) * 100);
}
