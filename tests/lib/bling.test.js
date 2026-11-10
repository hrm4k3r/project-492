import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, pagamento: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/mercadopago", () => ({ buscarPagamento: async () => h.pagamento }));

import { emitirNFe } from "../../src/lib/bling";

const pedido = (extra = {}) => ({
  id: "o1", total: 115, subtotal: 100, frete: 15, desconto: 0, created_at: "2026-11-04T12:00:00Z",
  payment_id: "pay1", nfe_id: null, nfe_status: null, nfe_erro: null,
  order_items: [
    { id: "i1", titulo: "Vinho", preco_unitario: 50, quantidade: 2, subtotal: 100,
      produtos: { ncm: "2204.21.00", unidade: "UN", cfop: null } },
  ],
  addresses: { street: "Rua A", number: "1", complement: null, neighborhood: "Centro", city: "São Lourenço", state: "MG", cep: "37470-000" },
  profiles: { full_name: "Ana Souza", documento: "12345678909" },
  ...extra,
});

let chamadas;
let rotas;

// rotas: "METODO /caminho" (sem /Api/v3 e sem query) -> { status, corpo } | () => { throw }
function bling(extra = {}) {
  rotas = {
    "POST /nfe": { status: 201, corpo: { data: { id: 123 } } },
    "POST /nfe/123/enviar": { status: 200, corpo: {} },
    "GET /nfe/123": { status: 200, corpo: { data: { situacao: 5 } } },
    ...extra,
  };
}

beforeEach(() => {
  chamadas = [];
  h.pagamento = { payment_type_id: "bank_transfer" };
  process.env.BLING_FORMA_PGTO_PIX = "777";
  delete process.env.BLING_FORMA_PGTO_CREDITO;
  h.db = criarBanco({
    tabelas: {
      orders: [pedido()],
      integracoes: [{ id: "bling", dados: { access_token: "tok", refresh_token: "r", expires_at: Date.now() + 1e7 } }],
    },
  });
  bling();
  global.fetch = vi.fn(async (url, opcoes = {}) => {
    const u = new URL(url);
    const chave = `${opcoes.method ?? "GET"} ${u.pathname.replace("/Api/v3", "")}`;
    chamadas.push({ chave, url: String(url), corpo: opcoes.body ? JSON.parse(opcoes.body) : null, auth: opcoes.headers?.Authorization });
    const rota = rotas[chave];
    if (!rota) return { ok: false, status: 404, json: async () => ({ error: { message: "rota inesperada " + chave } }) };
    if (typeof rota === "function") return rota();
    return { ok: rota.status < 400, status: rota.status, json: async () => rota.corpo };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ordem = () => h.db.tabelas.orders[0];

describe("emitirNFe", () => {
  it("cria a nota, envia à Sefaz e guarda id e situação no pedido", async () => {
    const r = await emitirNFe("o1");

    expect(chamadas.map((c) => c.chave)).toEqual(["POST /nfe", "POST /nfe/123/enviar", "GET /nfe/123"]);
    expect(chamadas[1].url).toContain("enviarEmail=false");
    expect(chamadas.every((c) => c.auth === "Bearer tok")).toBe(true);
    expect(ordem()).toMatchObject({ nfe_id: "123", nfe_status: "5", nfe_erro: null });
    expect(r).toEqual({ id: "123", situacao: "5" });
  });

  it("monta a nota com CPF só em dígitos, NCM limpo, CFOP interno e o id do Pix", async () => {
    await emitirNFe("o1");
    const nota = chamadas[0].corpo;
    expect(nota.contato).toMatchObject({ tipoPessoa: "F", numeroDocumento: "12345678909" });
    expect(nota.contato.endereco.cep).toBe("37470000");
    expect(nota.itens[0]).toMatchObject({ cfop: "6102", quantidade: 2, valor: 50 });
    expect(nota.itens[0].classificacaoFiscal).toBe("22042100");
    expect(nota.parcelas[0]).toMatchObject({ valor: 115, formaPagamento: { id: 777 } });
  });

  it("informa o código do produto e distribui o desconto para a parcela bater com o total", async () => {
    ordem().desconto = 10;
    ordem().total = 105;
    await emitirNFe("o1");
    const nota = chamadas[0].corpo;
    expect(nota.itens[0].codigo).toBeTruthy();
    expect(nota.itens[0].quantidade * nota.itens[0].valor).toBeCloseTo(90, 2);
    expect(nota.parcelas[0].valor).toBe(105);
    expect(nota.parcelas[0].data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("desconto do Pix (já aplicado ao total) entra na nota e a parcela fecha com o valor pago", async () => {
    ordem().desconto_pix = 5;
    ordem().total = 110; // 100 de produtos - 5 do Pix + 15 de frete
    await emitirNFe("o1");
    const nota = chamadas[0].corpo;
    const totalItens = nota.itens.reduce((t, i) => t + i.quantidade * i.valor, 0);
    expect(totalItens).toBeCloseTo(95, 2);
    expect(nota.parcelas[0].valor).toBe(110);
  });

  it("não cria uma segunda nota: depois de falha no envio, só reenvia a mesma", async () => {
    rotas["POST /nfe/123/enviar"] = { status: 500, corpo: { error: { message: "Sefaz fora do ar" } } };
    await expect(emitirNFe("o1")).rejects.toThrow("Sefaz fora do ar");
    expect(ordem()).toMatchObject({ nfe_id: "123", nfe_status: null, nfe_erro: "Sefaz fora do ar" });

    chamadas.length = 0;
    rotas["POST /nfe/123/enviar"] = { status: 200, corpo: {} };
    await emitirNFe("o1");
    expect(chamadas.map((c) => c.chave)).toEqual(["POST /nfe/123/enviar", "GET /nfe/123"]);
    expect(ordem()).toMatchObject({ nfe_status: "5", nfe_erro: null });
  });

  it("nota já enviada não faz nenhuma chamada ao Bling", async () => {
    h.db.tabelas.orders[0] = pedido({ nfe_id: "123", nfe_status: "5" });
    const r = await emitirNFe("o1");
    expect(chamadas).toHaveLength(0);
    expect(r).toMatchObject({ jaEmitida: true });
  });

  it("falha ao consultar a situação não invalida o envio", async () => {
    rotas["GET /nfe/123"] = { status: 500, corpo: {} };
    await emitirNFe("o1");
    expect(ordem()).toMatchObject({ nfe_id: "123", nfe_status: "enviada", nfe_erro: null });
  });

  it("recusa do Bling na criação grava o motivo e não deixa id de nota", async () => {
    rotas["POST /nfe"] = {
      status: 422,
      corpo: { error: { message: "Dados inválidos", fields: [{ msg: "NCM inválido" }] } },
    };
    await expect(emitirNFe("o1")).rejects.toThrow("Dados inválidos: NCM inválido");
    expect(ordem()).toMatchObject({ nfe_id: null, nfe_erro: "Dados inválidos: NCM inválido" });
  });

  it("sem resposta do Bling ao criar manda conferir no Bling antes de repetir", async () => {
    rotas["POST /nfe"] = () => { throw new Error("timeout"); };
    await expect(emitirNFe("o1")).rejects.toThrow(/Confira em Vendas/);
    expect(ordem().nfe_id).toBeNull();
    expect(ordem().nfe_erro).toMatch(/não respondeu/);
  });

  it("produto sem NCM, cliente sem CPF ou sem endereço: erro claro e nada vai ao Bling", async () => {
    h.db.tabelas.orders[0] = pedido({
      order_items: [{ id: "i1", titulo: "Vinho X", preco_unitario: 50, quantidade: 1, subtotal: 50, produtos: { ncm: null } }],
    });
    await expect(emitirNFe("o1")).rejects.toThrow(/sem NCM: Vinho X/);

    h.db.tabelas.orders[0] = pedido({ profiles: { full_name: "Ana", documento: null } });
    await expect(emitirNFe("o1")).rejects.toThrow(/sem CPF/);

    h.db.tabelas.orders[0] = pedido({ addresses: null });
    await expect(emitirNFe("o1")).rejects.toThrow(/sem endereço/);

    expect(chamadas).toHaveLength(0);
  });

  describe("forma de pagamento", () => {
    it("pedido confirmado à mão (sem payment_id) usa o Pix", async () => {
      h.db.tabelas.orders[0] = pedido({ payment_id: null });
      await emitirNFe("o1");
      expect(chamadas[0].corpo.parcelas[0].formaPagamento.id).toBe(777);
    });

    it("sem o id do Pix configurado, pede para definir a variável", async () => {
      delete process.env.BLING_FORMA_PGTO_PIX;
      await expect(emitirNFe("o1")).rejects.toThrow(/BLING_FORMA_PGTO_PIX/);
      expect(chamadas).toHaveLength(0);
    });

    it("cartão sem o id correspondente configurado pede a variável do cartão", async () => {
      h.pagamento = { payment_type_id: "credit_card" };
      await expect(emitirNFe("o1")).rejects.toThrow(/BLING_FORMA_PGTO_CREDITO/);
    });

    it("tipo de pagamento desconhecido é recusado", async () => {
      h.pagamento = { payment_type_id: "ticket" };
      await expect(emitirNFe("o1")).rejects.toThrow(/sem mapeamento/);
    });
  });

  it("Bling não conectado grava o erro no pedido", async () => {
    h.db.tabelas.integracoes = [];
    await expect(emitirNFe("o1")).rejects.toThrow(/não conectado/);
    expect(ordem().nfe_erro).toMatch(/não conectado/);
  });
});
