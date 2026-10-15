// ATENÇÃO: server-only. Nunca importe em componentes client.
const MP_BASE = "https://api.mercadopago.com";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function criarPagamento({
  orderId,
  total,
  payerEmail,
  payerIdentification,
  selectedPaymentMethod,
  formData,
}) {
  const body = {
    transaction_amount: Number(total),
    description: "Curadoria da Mesa",
    external_reference: orderId,
    payer: { email: payerEmail },
  };

  if (payerIdentification?.type && payerIdentification?.number) {
    body.payer.identification = payerIdentification;
  }

  if (selectedPaymentMethod === "credit_card" || selectedPaymentMethod === "debit_card") {
    body.token = formData.token;
    body.payment_method_id = formData.payment_method_id;
    body.installments = Number(formData.installments) || 1;
    if (formData.issuer_id) body.issuer_id = String(formData.issuer_id);
  } else if (selectedPaymentMethod === "ticket") {
    // Pix ou boleto
    body.payment_method_id = formData.payment_method_id;
  }

  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "X-Idempotency-Key": `${orderId}-${selectedPaymentMethod}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? `MP erro ${res.status}: ${JSON.stringify(data.cause ?? data)}`);
  }
  return data;
}

export async function buscarPagamento(paymentId) {
  const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  return res.json();
}
