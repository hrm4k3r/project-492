// Cliente da API InfinitePay — servidor apenas, nunca importe em componentes client.
// Documentação: https://www.infinitepay.io/checkout-documentacao
// Autenticação: handle (InfiniteTag sem o "$")

const BASE_URL = "https://api.checkout.infinitepay.io";

/**
 * Cria um link de checkout hospedado pela InfinitePay.
 * O cliente é redirecionado para essa URL, onde escolhe Pix ou cartão.
 */
export async function criarLinkPagamento({
  orderId,
  total,
  customer,
  redirectUrl,
  webhookUrl,
}) {
  const handle = process.env.INFINITEPAY_HANDLE;
  if (!handle) throw new Error("INFINITEPAY_HANDLE não configurado");

  const codigoPedido = orderId.slice(0, 8).toUpperCase();

  const body = {
    handle,
    order_nsu: orderId,
    items: [
      {
        quantity: 1,
        price: Math.round(total * 100), // em centavos
        description: `Pedido #${codigoPedido} — Curadoria da Mesa`,
      },
    ],
    redirect_url: redirectUrl,
    webhook_url: webhookUrl,
  };

  if (customer?.name || customer?.email) {
    body.customer = {
      ...(customer.name && { name: customer.name }),
      ...(customer.email && { email: customer.email }),
      ...(customer.phone && { phone_number: customer.phone }),
    };
  }

  const response = await fetch(`${BASE_URL}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`InfinitePay ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Valida um pagamento contra a API InfinitePay.
 * Use para confirmar autenticidade antes de marcar o pedido como pago.
 */
export async function verificarPagamento({ orderId, transactionNsu, slug }) {
  const handle = process.env.INFINITEPAY_HANDLE;
  if (!handle) throw new Error("INFINITEPAY_HANDLE não configurado");

  const response = await fetch(`${BASE_URL}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle,
      order_nsu: orderId,
      transaction_nsu: transactionNsu,
      slug,
    }),
  });

  return response.json();
}
