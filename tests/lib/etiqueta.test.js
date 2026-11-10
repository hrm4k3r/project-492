import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ me: vi.fn(), calcular: vi.fn(), chave: vi.fn(), email: vi.fn() }));
vi.mock("../../src/lib/melhorenvio", () => ({
  chamarMelhorEnvio: (...a) => h.me(...a),
  calcularFrete: (...a) => h.calcular(...a),
}));
vi.mock("../../src/lib/bling", () => ({ chaveDaNFe: (...a) => h.chave(...a) }));
vi.mock("../../src/lib/email", () => ({ destinosDoAviso: () => [], enviarEmailAtualizacaoStatus: (...a) => h.email(...a) }));
vi.mock("../../src/lib/frete", () => ({
  produtosParaMelhorEnvio: async () => [{ id: "caixa-1", width: 16, height: 25, length: 23, weight: 1.2, insurance_value: 50, quantity: 1 }],
}));

import { montarCarrinho, remetentePadrao, prepararEtiqueta, comprarEtiqueta, urlDaEtiqueta } from "../../src/lib/etiqueta";

const pedido = (extra = {}) => ({
  id: "abcdef12-0000", profile_id: "u1", status: "pago", total: 70, frete: 20, frete_servico: "Correios PAC",
  nfe_id: "9", nfe_status: "5", codigo_rastreio: null, etiqueta_id: null, etiqueta_status: null, etiqueta_erro: null,
  order_items: [{ titulo: "Vinho", quantidade: 1, preco_unitario: 50, produto_id: "p1" }],
  addresses: { street: "Rua A", number: "10", complement: null, neighborhood: "Centro", city: "Salvador", state: "ba", cep: "41150-575" },
  profiles: { full_name: "Ana Souza", phone: "(71) 99999-0000", documento: "123.456.789-09" },
  ...extra,
});

const novoBanco = (extra) => criarBanco({
  tokens: { x: { id: "u1", email: "ana@teste.com" } },
  tabelas: { orders: [pedido(extra)], configuracoes: [] },
});
const ordem = (db) => db.tabelas.orders[0];
const ID = "abcdef12-0000";

beforeEach(() => {
  h.me.mockReset();
  h.email.mockReset().mockResolvedValue();
  h.calcular.mockReset().mockResolvedValue([
    { id: 1, name: "PAC", company: { name: "Correios" }, price: "31.56", delivery_time: 7 },
    { id: 2, name: "SEDEX", company: { name: "Correios" }, price: "62.10", delivery_time: 3 },
  ]);
  h.chave.mockReset().mockResolvedValue("35".padEnd(44, "1"));
  process.env.MELHORENVIO_REMETENTE_EMAIL = "loja@teste.com";
});

describe("montarCarrinho", () => {
  const base = {
    order: pedido(), remetente: remetentePadrao(), servicoId: 1, chaveNFe: "1".repeat(44),
    emailCliente: "ana@teste.com", volumesBase: [{ width: 16, height: 25, length: 23, weight: 1.2, quantity: 1 }],
  };

  it("remetente é a Curadoria da Mesa (CNPJ só em dígitos)", () => {
    const c = montarCarrinho(base);
    expect(c.from).toMatchObject({ company_document: "64606408000194", postal_code: "37470000", city: "São Lourenço", state_abbr: "MG", number: "143" });
    expect(c.from.name).toContain("Curadoria da Mesa");
  });

  it("destinatário PF usa document; PJ usa company_document; CEP e telefone só dígitos, UF maiúscula", () => {
    const pf = montarCarrinho(base).to;
    expect(pf).toMatchObject({ document: "12345678909", postal_code: "41150575", phone: "71999990000", state_abbr: "BA", email: "ana@teste.com" });
    expect(pf.company_document).toBeUndefined();
    const pj = montarCarrinho({ ...base, order: pedido({ profiles: { full_name: "Loja X", phone: "", documento: "12.345.678/0001-95" } }) }).to;
    expect(pj.company_document).toBe("12345678000195");
    expect(pj.document).toBeUndefined();
  });

  it("serviço, chave da NF-e, valor declarado sem o frete e volumes expandidos", () => {
    const c = montarCarrinho({ ...base, volumesBase: [{ width: 16, height: 25, length: 23, weight: 1.2, quantity: 2 }] });
    expect(c.service).toBe(1);
    expect(c.options.invoice.key).toBe("1".repeat(44));
    expect(c.options.insurance_value).toBe(50); // total 70 - frete 20
    expect(c.volumes).toHaveLength(2);
    expect(c.products).toEqual([{ name: "Vinho", quantity: 1, unitary_value: 50 }]);
  });
});

describe("prepararEtiqueta (não cobra nada)", () => {
  it("exige NF-e emitida e chave de acesso", async () => {
    await expect(prepararEtiqueta(novoBanco({ nfe_status: null }), ID)).rejects.toThrow(/Emita a NF-e/);
    h.chave.mockResolvedValue(null);
    await expect(prepararEtiqueta(novoBanco(), ID)).rejects.toThrow(/chave de acesso/);
    expect(h.me).not.toHaveBeenCalled();
  });

  it("recusa retirada, motoboy e pedido não pago", async () => {
    await expect(prepararEtiqueta(novoBanco({ frete_servico: "Retirada no local" }), ID)).rejects.toThrow(/transportadora/);
    await expect(prepararEtiqueta(novoBanco({ frete_servico: "Entrega por motoboy" }), ID)).rejects.toThrow(/transportadora/);
    await expect(prepararEtiqueta(novoBanco({ status: "pendente" }), ID)).rejects.toThrow(/pago/);
  });

  it("cria o carrinho no serviço escolhido pelo cliente e grava o id, sem checkout", async () => {
    const db = novoBanco();
    h.me.mockResolvedValue({ id: "env-1", price: 31.56 });
    const r = await prepararEtiqueta(db, ID);
    expect(r).toMatchObject({ servico: "Correios PAC", preco: 31.56, prazoDias: 7, etiquetaId: "env-1" });
    expect(h.me).toHaveBeenCalledTimes(1);
    expect(h.me.mock.calls[0][0]).toBe("/me/cart");
    expect(h.me.mock.calls[0][1].body.service).toBe(1);
    expect(ordem(db)).toMatchObject({ etiqueta_id: "env-1", etiqueta_status: "carrinho" });
  });

  it("serviço que sumiu da cotação não cria envio", async () => {
    h.calcular.mockResolvedValue([{ id: 2, name: "SEDEX", company: { name: "Correios" }, price: "62" }]);
    await expect(prepararEtiqueta(novoBanco(), ID)).rejects.toThrow(/não está disponível/);
    expect(h.me).not.toHaveBeenCalled();
  });

  it("repetir não cria um segundo envio", async () => {
    const db = novoBanco({ etiqueta_id: "env-1", etiqueta_status: "carrinho" });
    h.me.mockResolvedValue({ price: 31.56, delivery_min: 7 });
    const r = await prepararEtiqueta(db, ID);
    expect(r.jaPreparada).toBe(true);
    expect(h.me.mock.calls.every(([caminho]) => caminho !== "/me/cart")).toBe(true);
  });

  it("erro do Melhor Envio chega ao painel e nada é gravado", async () => {
    const db = novoBanco();
    h.me.mockRejectedValue(new Error("to.document: inválido"));
    await expect(prepararEtiqueta(db, ID)).rejects.toThrow("to.document");
    expect(ordem(db).etiqueta_id).toBeNull();
  });
});

describe("comprarEtiqueta (gasta saldo)", () => {
  const pronto = () => novoBanco({ etiqueta_id: "env-1", etiqueta_status: "carrinho" });

  it("exige preparar antes", async () => {
    await expect(comprarEtiqueta(novoBanco(), ID)).rejects.toThrow(/Prepare/);
    expect(h.me).not.toHaveBeenCalled();
  });

  it("paga, gera a etiqueta e grava o código de rastreio", async () => {
    const db = pronto();
    h.me.mockImplementation(async (caminho) => (caminho === "/me/orders/env-1" ? { tracking: "AA123456789BR" } : {}));
    const r = await comprarEtiqueta(db, ID);
    expect(h.me.mock.calls.map(([c]) => c)).toEqual(["/me/shipment/checkout", "/me/shipment/generate", "/me/orders/env-1"]);
    expect(r.codigoRastreio).toBe("AA123456789BR");
    expect(ordem(db)).toMatchObject({ etiqueta_status: "gerada", codigo_rastreio: "AA123456789BR" });
  });

  it("etiqueta gerada move o pedido de pago para preparando e avisa o cliente uma vez", async () => {
    const db = pronto();
    h.me.mockResolvedValue({});
    await comprarEtiqueta(db, ID);
    expect(ordem(db).status).toBe("preparando");
    expect(h.email).toHaveBeenCalledTimes(1);
    expect(h.email).toHaveBeenCalledWith(ID, "preparando");
  });

  it("pedido que já estava em preparando ou enviado não volta nem reenvia e-mail", async () => {
    const db = novoBanco({ status: "enviado", etiqueta_id: "env-1", etiqueta_status: "carrinho" });
    h.me.mockResolvedValue({});
    await comprarEtiqueta(db, ID);
    expect(ordem(db).status).toBe("enviado");
    expect(h.email).not.toHaveBeenCalled();
  });

  it("clique duplo paga uma vez só", async () => {
    const db = pronto();
    h.me.mockResolvedValue({});
    const resultados = await Promise.allSettled([comprarEtiqueta(db, ID), comprarEtiqueta(db, ID)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(h.me.mock.calls.filter(([c]) => c === "/me/shipment/checkout")).toHaveLength(1);
  });

  it("saldo insuficiente: volta para carrinho com o erro, e nada foi pago", async () => {
    const db = pronto();
    h.me.mockRejectedValue(new Error("Saldo insuficiente"));
    await expect(comprarEtiqueta(db, ID)).rejects.toThrow("Saldo insuficiente");
    expect(ordem(db)).toMatchObject({ etiqueta_status: "carrinho", etiqueta_erro: "Saldo insuficiente" });
  });

  it("falha ao gerar depois de pagar: fica paga e a nova tentativa NÃO paga de novo", async () => {
    const db = pronto();
    h.me.mockImplementation(async (caminho) => {
      if (caminho === "/me/shipment/generate") throw new Error("Melhor Envio fora do ar");
      return {};
    });
    await expect(comprarEtiqueta(db, ID)).rejects.toThrow("fora do ar");
    expect(ordem(db).etiqueta_status).toBe("paga");

    h.me.mockReset().mockResolvedValue({});
    await comprarEtiqueta(db, ID);
    expect(h.me.mock.calls.some(([c]) => c === "/me/shipment/checkout")).toBe(false);
    expect(ordem(db).etiqueta_status).toBe("gerada");
  });

  it("etiqueta já gerada não compra nada", async () => {
    const r = await comprarEtiqueta(novoBanco({ etiqueta_id: "env-1", etiqueta_status: "gerada", codigo_rastreio: "AA1" }), ID);
    expect(r.jaGerada).toBe(true);
    expect(h.me).not.toHaveBeenCalled();
  });
});

describe("urlDaEtiqueta", () => {
  it("só depois de gerada; devolve o link do PDF", async () => {
    await expect(urlDaEtiqueta(novoBanco({ etiqueta_id: "env-1", etiqueta_status: "carrinho" }), ID)).rejects.toThrow(/ainda não foi gerada/);
    h.me.mockResolvedValue({ url: "https://melhorenvio.com.br/imprimir/abc" });
    const r = await urlDaEtiqueta(novoBanco({ etiqueta_id: "env-1", etiqueta_status: "gerada" }), ID);
    expect(r.url).toBe("https://melhorenvio.com.br/imprimir/abc");
  });
});
