import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { criarBanco, requisicao, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({
  db: null,
  buscarPagamento: vi.fn(),
  criarPagamento: vi.fn(),
  enviarEmail: vi.fn(),
  emitirNFe: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/mercadopago", () => ({
  buscarPagamento: (...a) => h.buscarPagamento(...a),
  criarPagamento: (...a) => h.criarPagamento(...a),
}));
vi.mock("../../src/lib/email", () => ({
  enviarEmailConfirmacaoPedido: (...a) => h.enviarEmail(...a),
  enviarEmailAtualizacaoStatus: vi.fn(),
  enviarEmailNovoPedidoParaLoja: vi.fn(async () => {}),
}));
vi.mock("../../src/lib/bling", () => ({ emitirNFe: (...a) => h.emitirNFe(...a) }));
vi.mock("../../src/lib/telegram", () => ({ enviarTelegramNovoPedido: vi.fn(async () => {}) }));

import { POST as verificar } from "../../src/app/api/pagamento/verificar/route";
import { POST as webhook } from "../../src/app/api/pagamento/webhook/route";
import { POST as criar } from "../../src/app/api/pagamento/criar/route";
import { confirmarPagamento } from "../../src/lib/pedidos";

const pedido = (id, extra = {}) => ({
  id, profile_id: "u1", status: "pendente", total: 100, payment_id: null, payment_status: null, ...extra,
});

function novoBanco(orders) {
  return criarBanco({
    tokens: { "tok-u1": { id: "u1", email: "ana@teste.com" }, "tok-u2": { id: "u2", email: "bia@teste.com" } },
    tabelas: { orders },
  });
}

const status = (id) => h.db.tabelas.orders.find((o) => o.id === id).status;
const aguardarEfeitos = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.buscarPagamento.mockReset();
  h.criarPagamento.mockReset();
  h.enviarEmail.mockReset().mockResolvedValue();
  h.emitirNFe.mockReset().mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  vi.restoreAllMocks();
});

describe("confirmarPagamento", () => {
  it("dispara e-mail e NF-e uma única vez, mesmo em chamadas simultâneas", async () => {
    h.db = novoBanco([pedido("o1")]);
    const resultados = await Promise.all([
      confirmarPagamento(h.db, "o1"),
      confirmarPagamento(h.db, "o1"),
      confirmarPagamento(h.db, "o1"),
    ]);
    expect(resultados.filter(Boolean)).toHaveLength(1);
    expect(status("o1")).toBe("pago");
    expect(h.enviarEmail).toHaveBeenCalledTimes(1);
    expect(h.emitirNFe).toHaveBeenCalledTimes(1);
  });

  it("não dispara nada se o pedido já estava pago", async () => {
    h.db = novoBanco([pedido("o1", { status: "pago" })]);
    expect(await confirmarPagamento(h.db, "o1")).toBe(false);
    expect(h.enviarEmail).not.toHaveBeenCalled();
    expect(h.emitirNFe).not.toHaveBeenCalled();
  });

  it("falha na NF-e não derruba a confirmação", async () => {
    h.db = novoBanco([pedido("o1")]);
    h.emitirNFe.mockRejectedValue(new Error("Bling fora do ar"));
    await expect(confirmarPagamento(h.db, "o1")).resolves.toBe(true);
    await aguardarEfeitos();
    expect(status("o1")).toBe("pago");
  });
});

describe("POST /api/pagamento/verificar", () => {
  const chamar = async (body) => resposta(await verificar(requisicao("https://loja.test/api/pagamento/verificar", { body })));

  it("confirma pedido cujo pagamento aprovado confere (id, valor e referência)", async () => {
    h.db = novoBanco([pedido("o1", { payment_id: "mp-1" })]);
    h.buscarPagamento.mockResolvedValue({ status: "approved", external_reference: "o1", transaction_amount: 100 });
    expect((await chamar({ orderId: "o1" })).json.status).toBe("pago");
    expect(status("o1")).toBe("pago");
    expect(h.enviarEmail).toHaveBeenCalledTimes(1);
  });

  it("ignora o paymentId enviado pelo cliente e consulta só o do pedido", async () => {
    h.db = novoBanco([pedido("o1", { payment_id: "mp-1" })]);
    h.buscarPagamento.mockResolvedValue({ status: "pending" });
    await chamar({ orderId: "o1", paymentId: "mp-de-outro-pedido" });
    expect(h.buscarPagamento).toHaveBeenCalledWith("mp-1");
  });

  it("não quita o pedido com o pagamento aprovado de outro pedido", async () => {
    h.db = novoBanco([pedido("caro", { total: 500, payment_id: "mp-9" })]);
    h.buscarPagamento.mockResolvedValue({ status: "approved", external_reference: "barato", transaction_amount: 5 });
    const r = await chamar({ orderId: "caro" });
    expect(r.json.status).toBe("pendente");
    expect(status("caro")).toBe("pendente");
    expect(h.enviarEmail).not.toHaveBeenCalled();
  });

  it("não quita o pedido com pagamento de mesmo valor que pertence a outro pedido", async () => {
    h.db = novoBanco([pedido("o1", { total: 100, payment_id: "mp-9" })]);
    h.buscarPagamento.mockResolvedValue({ status: "approved", external_reference: "outro-pedido", transaction_amount: 100 });
    expect((await chamar({ orderId: "o1" })).json.status).toBe("pendente");
    expect(status("o1")).toBe("pendente");
  });

  it("não confirma quando o valor pago é menor que o total", async () => {
    h.db = novoBanco([pedido("o1", { payment_id: "mp-1" })]);
    h.buscarPagamento.mockResolvedValue({ status: "approved", external_reference: "o1", transaction_amount: 1 });
    await chamar({ orderId: "o1" });
    expect(status("o1")).toBe("pendente");
  });

  it("pedido sem pagamento registrado continua pendente, sem consultar o MP", async () => {
    h.db = novoBanco([pedido("o1")]);
    expect((await chamar({ orderId: "o1" })).json.status).toBe("pendente");
    expect(h.buscarPagamento).not.toHaveBeenCalled();
  });

  it("informa pagamento recusado e 404 para pedido inexistente", async () => {
    h.db = novoBanco([pedido("o1", { payment_id: "mp-1" })]);
    h.buscarPagamento.mockResolvedValue({ status: "rejected", status_detail: "cc_rejected_other_reason" });
    expect((await chamar({ orderId: "o1" })).json.status).toBe("rejeitado");
    expect((await chamar({ orderId: "nao-existe" })).status).toBe(404);
  });
});

describe("POST /api/pagamento/webhook", () => {
  const SEGREDO = "segredo-de-teste";
  const aviso = (extra = {}) => ({ type: "payment", data: { id: "mp-1" }, ...extra });

  const chamar = async (body, { assinar = false, hash } = {}) => {
    const headers = {};
    if (assinar) {
      const ts = "1700000000";
      const manifesto = `id:mp-1;request-id:req-1;ts:${ts};`;
      headers["x-request-id"] = "req-1";
      headers["x-signature"] = `ts=${ts},v1=${hash ?? createHmac("sha256", SEGREDO).update(manifesto).digest("hex")}`;
    }
    return resposta(await webhook(requisicao("https://loja.test/api/pagamento/webhook?data.id=mp-1", { body, headers })));
  };

  const aprovado = (extra = {}) => ({ status: "approved", external_reference: "o1", transaction_amount: 100, ...extra });

  it("confirma o pedido e responde 200", async () => {
    h.db = novoBanco([pedido("o1")]);
    h.buscarPagamento.mockResolvedValue(aprovado());
    expect((await chamar(aviso())).status).toBe(200);
    expect(status("o1")).toBe("pago");
  });

  it("é idempotente: notificações repetidas não duplicam e-mail nem NF-e", async () => {
    h.db = novoBanco([pedido("o1")]);
    h.buscarPagamento.mockResolvedValue(aprovado());
    await chamar(aviso());
    await chamar(aviso());
    await chamar(aviso());
    await aguardarEfeitos();
    expect(h.enviarEmail).toHaveBeenCalledTimes(1);
    expect(h.emitirNFe).toHaveBeenCalledTimes(1);
  });

  it("ignora notificações que não são de pagamento ou pagamentos não aprovados", async () => {
    h.db = novoBanco([pedido("o1")]);
    expect((await chamar({ type: "merchant_order", data: { id: "1" } })).status).toBe(200);
    h.buscarPagamento.mockResolvedValue(aprovado({ status: "pending" }));
    expect((await chamar(aviso())).status).toBe(200);
    expect(status("o1")).toBe("pendente");
  });

  it("não confirma quando o valor pago diverge do pedido", async () => {
    h.db = novoBanco([pedido("o1")]);
    h.buscarPagamento.mockResolvedValue(aprovado({ transaction_amount: 10 }));
    await chamar(aviso());
    expect(status("o1")).toBe("pendente");
  });

  it("com segredo configurado: assinatura válida passa, inválida ou ausente leva 401", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SEGREDO;
    h.db = novoBanco([pedido("o1")]);
    h.buscarPagamento.mockResolvedValue(aprovado());

    expect((await chamar(aviso())).status).toBe(401);
    expect((await chamar(aviso(), { assinar: true, hash: "00" })).status).toBe(401);
    expect(status("o1")).toBe("pendente");
    expect(h.buscarPagamento).not.toHaveBeenCalled();

    expect((await chamar(aviso(), { assinar: true })).status).toBe(200);
    expect(status("o1")).toBe("pago");
  });

  it("falha inesperada responde 500 para o Mercado Pago tentar de novo", async () => {
    h.db = novoBanco([pedido("o1")]);
    h.buscarPagamento.mockRejectedValue(new Error("MP fora do ar"));
    expect((await chamar(aviso())).status).toBe(500);
  });
});

describe("POST /api/pagamento/criar", () => {
  const corpo = (extra = {}) => ({
    orderId: "o1",
    selectedPaymentMethod: "bank_transfer",
    formData: { payment_method_id: "pix" },
    ...extra,
  });
  const chamar = async (body, token = "tok-u1") =>
    resposta(await criar(requisicao("https://loja.test/api/pagamento/criar", { token, body })));

  beforeEach(() => {
    h.db = novoBanco([pedido("o1", { total: 100 })]);
    h.criarPagamento.mockResolvedValue({ id: 777, status: "pending", payment_method_id: "pix" });
  });

  it("exige login", async () => {
    expect((await chamar(corpo(), null)).status).toBe(401);
    expect((await chamar(corpo(), "token-invalido")).status).toBe(401);
    expect(h.criarPagamento).not.toHaveBeenCalled();
  });

  it("só o dono do pedido paga por ele (para os outros, o pedido não existe)", async () => {
    expect((await chamar(corpo(), "tok-u2")).status).toBe(404);
    expect(h.criarPagamento).not.toHaveBeenCalled();
  });

  it("cobra o total gravado no banco, não um valor enviado pelo navegador", async () => {
    const r = await chamar(corpo({ total: 0.01, transaction_amount: 0.01 }));
    expect(r.status).toBe(200);
    expect(h.criarPagamento).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o1", total: 100 }));
  });

  it("grava o id do pagamento no pedido, usado depois pelo verificar", async () => {
    await chamar(corpo());
    expect(h.db.tabelas.orders[0]).toMatchObject({ payment_provider: "mercadopago", payment_id: "777" });
  });

  it("recusa pedido já pago", async () => {
    h.db = novoBanco([pedido("o1", { status: "pago" })]);
    expect((await chamar(corpo())).status).toBe(409);
  });

  it("erro do Mercado Pago chega ao cliente sem detalhes técnicos", async () => {
    h.criarPagamento.mockRejectedValue(new Error("MP erro 400: {\"cause\":[\"token secreto\"]}"));
    const r = await chamar(corpo());
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.json)).not.toMatch(/token secreto|MP erro/);
  });
});

describe("desconto no Pix", () => {
  // Pedido de R$ 105 (R$ 100 de produtos + R$ 5 de frete) com R$ 5 de desconto se pagar no Pix.
  const comDesconto = (id = "o1", extra = {}) => pedido(id, { total: 105, desconto_pix: 5, ...extra });
  const total = (id) => h.db.tabelas.orders.find((o) => o.id === id);
  const pix = (valor, extra = {}) => ({ status: "approved", external_reference: "o1", payment_method_id: "pix", transaction_amount: valor, ...extra });

  describe("cobrança (POST /api/pagamento/criar)", () => {
    const chamar = (body) => criar(requisicao("https://loja.test/api/pagamento/criar", { token: "tok-u1", body })).then(resposta);

    it("Pix cobra o total menos o desconto e marca o pedido como Pix", async () => {
      h.db = novoBanco([comDesconto()]);
      h.criarPagamento.mockResolvedValue({ id: 1, status: "pending", payment_method_id: "pix" });
      await chamar({ orderId: "o1", selectedPaymentMethod: "bank_transfer", formData: { payment_method_id: "pix" } });
      expect(h.criarPagamento).toHaveBeenCalledWith(expect.objectContaining({ total: 100 }));
      expect(total("o1")).toMatchObject({ total: 105, payment_method: "pix", status: "pendente" });
    });

    it("cartão cobra o total cheio, sem desconto", async () => {
      h.db = novoBanco([comDesconto()]);
      h.criarPagamento.mockResolvedValue({ id: 2, status: "in_process", payment_method_id: "visa" });
      await chamar({ orderId: "o1", selectedPaymentMethod: "credit_card", formData: { token: "t", payment_method_id: "visa" } });
      expect(h.criarPagamento).toHaveBeenCalledWith(expect.objectContaining({ total: 105 }));
      expect(total("o1").payment_method).toBeUndefined();
    });

    it("cartão aprovado na hora confirma pelo caminho completo (e-mail, NF-e) e zera o desconto do Pix", async () => {
      h.db = novoBanco([comDesconto()]);
      h.criarPagamento.mockResolvedValue({ id: 3, status: "approved", payment_method_id: "visa" });
      await chamar({ orderId: "o1", selectedPaymentMethod: "credit_card", formData: { token: "t", payment_method_id: "visa" } });
      expect(total("o1")).toMatchObject({ status: "pago", total: 105, desconto_pix: 0 });
      expect(h.enviarEmail).toHaveBeenCalledTimes(1);
      expect(h.emitirNFe).toHaveBeenCalledTimes(1);
    });
  });

  describe("confirmação (polling e webhook)", () => {
    it("Pix pago com o valor com desconto confirma e o total passa a ser o valor pago", async () => {
      h.db = novoBanco([comDesconto("o1", { payment_id: "mp-1" })]);
      h.buscarPagamento.mockResolvedValue(pix(100));
      const r = await resposta(await verificar(requisicao("https://loja.test/api/pagamento/verificar", { body: { orderId: "o1" } })));
      expect(r.json.status).toBe("pago");
      expect(total("o1")).toMatchObject({ status: "pago", total: 100, desconto_pix: 5 });
    });

    it("Pix pago com o valor cheio (sem o desconto) não confere", async () => {
      h.db = novoBanco([comDesconto("o1", { payment_id: "mp-1" })]);
      h.buscarPagamento.mockResolvedValue(pix(105));
      const r = await resposta(await verificar(requisicao("https://loja.test/api/pagamento/verificar", { body: { orderId: "o1" } })));
      expect(r.json.status).toBe("pendente");
      expect(total("o1").status).toBe("pendente");
    });

    it("cartão com o valor com desconto não confere; com o valor cheio confirma sem desconto", async () => {
      h.db = novoBanco([comDesconto("o1", { payment_id: "mp-1" })]);
      h.buscarPagamento.mockResolvedValue({ status: "approved", external_reference: "o1", payment_method_id: "visa", transaction_amount: 100 });
      const chamar = async () => resposta(await verificar(requisicao("https://loja.test/api/pagamento/verificar", { body: { orderId: "o1" } })));
      expect((await chamar()).json.status).toBe("pendente");

      h.buscarPagamento.mockResolvedValue({ status: "approved", external_reference: "o1", payment_method_id: "visa", transaction_amount: 105 });
      expect((await chamar()).json.status).toBe("pago");
      expect(total("o1")).toMatchObject({ total: 105, desconto_pix: 0 });
    });

    it("webhook de Pix também aplica o desconto", async () => {
      h.db = novoBanco([comDesconto()]);
      h.buscarPagamento.mockResolvedValue(pix(100));
      const r = await resposta(await webhook(requisicao("https://loja.test/api/pagamento/webhook?data.id=mp-1", { body: { type: "payment", data: { id: "mp-1" } } })));
      expect(r.status).toBe(200);
      expect(total("o1")).toMatchObject({ status: "pago", total: 100, desconto_pix: 5 });
    });
  });

  describe("confirmarPagamento", () => {
    it("só aplica o desconto quando o pagamento foi Pix", async () => {
      h.db = novoBanco([comDesconto("a"), comDesconto("b")]);
      await confirmarPagamento(h.db, "a", { pix: true });
      await confirmarPagamento(h.db, "b");
      expect(total("a")).toMatchObject({ total: 100, desconto_pix: 5 });
      expect(total("b")).toMatchObject({ total: 105, desconto_pix: 0 });
    });

    it("pedido sem desconto do Pix (antigo) mantém o total", async () => {
      h.db = novoBanco([pedido("o1", { total: 100 })]);
      await confirmarPagamento(h.db, "o1", { pix: true });
      expect(total("o1")).toMatchObject({ total: 100, status: "pago" });
    });

    it("confirmação em paralelo aplica o desconto uma única vez", async () => {
      h.db = novoBanco([comDesconto()]);
      await Promise.all([confirmarPagamento(h.db, "o1", { pix: true }), confirmarPagamento(h.db, "o1", { pix: true })]);
      expect(total("o1").total).toBe(100);
      expect(h.emitirNFe).toHaveBeenCalledTimes(1);
    });
  });
});
