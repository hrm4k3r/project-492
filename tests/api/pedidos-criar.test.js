import { describe, it, expect, beforeEach, vi } from "vitest";
import { criarBanco, requisicao, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, cotarFrete: null, emailRecebido: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/frete", () => ({ cotarFrete: (...a) => h.cotarFrete(...a) }));
vi.mock("../../src/lib/email", () => ({ enviarEmailPedidoRecebido: (...a) => h.emailRecebido(...a) }));

import { POST } from "../../src/app/api/pedidos/criar/route";

const CPF = "529.982.247-25";
const endereco = (id, extra = {}) => ({
  id, profile_id: "u1", cep: "37470000", street: "Rua A", number: "10",
  neighborhood: "Centro", city: "São Lourenço", state: "MG", ...extra,
});

function novoBanco({ rpc, configuracoes = [] } = {}) {
  return criarBanco({
    tokens: { "tok-u1": { id: "u1" }, "tok-u2": { id: "u2" } },
    tabelas: {
      profiles: [{ id: "u1", role: "customer" }, { id: "u2", role: "customer" }],
      produtos: [
        { id: "p1", produto: "Cerveja", valor: 50, ativo: true },
        { id: "p2", produto: "Vinho", valor: 120, ativo: true },
        { id: "p3", produto: "Fora de linha", valor: 10, ativo: false },
      ],
      addresses: [
        endereco("a1"),
        endereco("a-caxambu", { city: "Caxambu" }),
        endereco("a-incompleto", { number: "" }),
        endereco("a-de-outro", { profile_id: "u2" }),
      ],
      configuracoes,
      orders: [],
      order_items: [],
    },
    rpc,
  });
}

const corpo = (extra = {}) => ({
  itens: [{ id: "p1", quantidade: 2 }],
  tipoEntrega: "retirada",
  addressId: "a1",
  documento: CPF,
  ...extra,
});

const chamar = async (body, token = "tok-u1") =>
  resposta(await POST(requisicao("https://loja.test/api/pedidos/criar", { token, body })));

beforeEach(() => {
  h.db = novoBanco();
  h.emailRecebido = vi.fn(async () => {});
  h.cotarFrete = vi.fn(async () => ({ opcoes: [{ servico: "PAC", preco: 30 }, { servico: "SEDEX", preco: 55 }] }));
});

describe("POST /api/pedidos/criar", () => {
  it("exige login", async () => {
    expect((await chamar(corpo(), null)).status).toBe(401);
    expect((await chamar(corpo(), "token-invalido")).status).toBe(401);
  });

  it("avisa o cliente que recebeu o pedido, e uma falha de e-mail não derruba o pedido", async () => {
    const r = await chamar(corpo());
    expect(r.status).toBe(200);
    expect(h.emailRecebido).toHaveBeenCalledWith(r.json.orderId);

    h.emailRecebido = vi.fn(async () => { throw new Error("resend fora do ar"); });
    expect((await chamar(corpo())).status).toBe(200);
  });

  it("não envia e-mail quando o pedido é recusado", async () => {
    await chamar(corpo({ addressId: null }));
    expect(h.emailRecebido).not.toHaveBeenCalled();
  });

  it("recalcula os preços no servidor, ignorando valores enviados pelo navegador", async () => {
    const r = await chamar(corpo({ total: 0.01, subtotal: 0.01, itens: [{ id: "p1", quantidade: 2, preco: 0.01 }] }));
    expect(r.status).toBe(200);
    const pedido = h.db.tabelas.orders[0];
    expect(pedido).toMatchObject({ profile_id: "u1", subtotal: 100, desconto: 0, frete: 0, total: 100, status: "pendente" });
    expect(h.db.tabelas.order_items[0]).toMatchObject({ order_id: r.json.orderId, preco_unitario: 50, quantidade: 2, subtotal: 100 });
  });

  it("recusa produto inexistente ou inativo", async () => {
    expect((await chamar(corpo({ itens: [{ id: "p3", quantidade: 1 }] }))).status).toBe(400);
    expect((await chamar(corpo({ itens: [{ id: "nao-existe", quantidade: 1 }] }))).status).toBe(400);
    expect(h.db.tabelas.orders).toHaveLength(0);
  });

  it("recusa quantidade inválida e carrinho vazio", async () => {
    for (const quantidade of [0, -1, 1.5, "abc"]) {
      expect((await chamar(corpo({ itens: [{ id: "p1", quantidade }] }))).status).toBe(400);
    }
    expect((await chamar(corpo({ itens: [] }))).status).toBe(400);
  });

  it("soma itens repetidos do mesmo produto", async () => {
    await chamar(corpo({ itens: [{ id: "p1", quantidade: 1 }, { id: "p1", quantidade: 2 }] }));
    expect(h.db.tabelas.orders[0].subtotal).toBe(150);
  });

  it("exige CPF/CNPJ válido e grava só os dígitos no perfil", async () => {
    expect((await chamar(corpo({ documento: "123.456.789-00" }))).status).toBe(400);
    expect((await chamar(corpo({ documento: "" }))).status).toBe(400);
    expect(h.db.tabelas.orders).toHaveLength(0);

    expect((await chamar(corpo())).status).toBe(200);
    expect(h.db.tabelas.profiles.find((p) => p.id === "u1").documento).toBe("52998224725");
  });

  describe("endereço obrigatório (a NF-e precisa dele)", () => {
    it("recusa pedido sem endereço, inclusive na retirada", async () => {
      expect((await chamar(corpo({ addressId: null }))).status).toBe(400);
      expect((await chamar(corpo({ addressId: undefined }))).status).toBe(400);
    });

    it("recusa endereço de outro cliente", async () => {
      expect((await chamar(corpo({ addressId: "a-de-outro" }))).status).toBe(400);
    });

    it("recusa endereço incompleto", async () => {
      const r = await chamar(corpo({ addressId: "a-incompleto" }));
      expect(r.status).toBe(400);
      expect(r.json.error).toMatch(/incompleto/i);
    });

    it("grava o endereço no pedido de retirada", async () => {
      await chamar(corpo());
      expect(h.db.tabelas.orders[0].address_id).toBe("a1");
    });
  });

  describe("entrega (Melhor Envio / tabela)", () => {
    it("usa o frete calculado no servidor para o serviço escolhido", async () => {
      const r = await chamar(corpo({ tipoEntrega: "entrega", freteServico: "SEDEX" }));
      expect(r.status).toBe(200);
      expect(h.db.tabelas.orders[0]).toMatchObject({ frete: 55, frete_servico: "SEDEX", total: 155 });
    });

    it("recusa serviço de frete inventado pelo cliente", async () => {
      const r = await chamar(corpo({ tipoEntrega: "entrega", freteServico: "FRETE GRÁTIS VIP", frete: 0 }));
      expect(r.status).toBe(400);
    });

    it("frete grátis acima do valor configurado", async () => {
      h.db = novoBanco({ configuracoes: [{ chave: "frete_gratis_acima", valor: 100 }] });
      const r = await chamar(corpo({ tipoEntrega: "entrega", freteServico: "PAC" }));
      expect(r.status).toBe(200);
      expect(h.db.tabelas.orders[0]).toMatchObject({ frete: 0, total: 100 });
    });
  });

  describe("motoboy", () => {
    it("cobra o preço fixo padrão (R$ 15) em São Lourenço", async () => {
      const r = await chamar(corpo({ tipoEntrega: "motoboy", freteServico: "qualquer coisa" }));
      expect(r.status).toBe(200);
      expect(h.db.tabelas.orders[0]).toMatchObject({ frete: 15, frete_servico: "Entrega por motoboy", total: 115 });
      expect(h.cotarFrete).not.toHaveBeenCalled();
    });

    it("recusa endereço de outra cidade", async () => {
      const r = await chamar(corpo({ tipoEntrega: "motoboy", addressId: "a-caxambu" }));
      expect(r.status).toBe(400);
      expect(r.json.error).toMatch(/São Lourenço/);
    });

    it("usa preço e cidade configurados no painel e não entra no frete grátis", async () => {
      h.db = novoBanco({
        configuracoes: [
          { chave: "motoboy_preco", valor: 22 },
          { chave: "motoboy_cidade", valor: "Caxambu" },
          { chave: "frete_gratis_acima", valor: 10 },
        ],
      });
      const r = await chamar(corpo({ tipoEntrega: "motoboy", addressId: "a-caxambu" }));
      expect(r.status).toBe(200);
      expect(h.db.tabelas.orders[0].frete).toBe(22);
    });

    it("preço 0 desativa a modalidade", async () => {
      h.db = novoBanco({ configuracoes: [{ chave: "motoboy_preco", valor: 0 }] });
      expect((await chamar(corpo({ tipoEntrega: "motoboy" }))).status).toBe(400);
    });
  });

  it("recusa tipo de entrega desconhecido", async () => {
    expect((await chamar(corpo({ tipoEntrega: "drone" }))).status).toBe(400);
  });

  describe("cupom", () => {
    const cupons = { BEMVINDO: { valid: true, discount_type: "percent", discount_value: 10, message: "ok" } };
    const rpc = {
      validate_coupon: ({ coupon_code }) => [
        cupons[String(coupon_code).toUpperCase()] ?? { valid: false, message: "Cupom não encontrado ou inativo." },
      ],
    };

    it("aplica o desconto calculado no servidor e informa o cliente à função do banco", async () => {
      h.db = novoBanco({ rpc });
      const r = await chamar(corpo({ cupom: "bemvindo", desconto: 9999 }));
      expect(r.status).toBe(200);
      expect(h.db.tabelas.orders[0]).toMatchObject({ desconto: 10, total: 90, coupon_code: "BEMVINDO" });
      expect(h.db.chamadasRpc[0]).toMatchObject({
        nome: "validate_coupon",
        args: { order_subtotal: 100, customer_id: "u1" },
      });
    });

    it("grava o CPF/CNPJ no perfil antes de validar o cupom (a regra de primeira compra confere o documento)", async () => {
      let documentoNaHora;
      h.db = novoBanco({
        rpc: {
          validate_coupon: () => {
            documentoNaHora = h.db.tabelas.profiles.find((p) => p.id === "u1").documento;
            return [{ valid: true, discount_type: "percent", discount_value: 10 }];
          },
        },
      });
      await chamar(corpo({ cupom: "BEMVINDO" }));
      expect(documentoNaHora).toBe("52998224725");
    });

    it("recusa cupom inválido (ex.: quem já comprou) com a mensagem do banco", async () => {
      h.db = novoBanco({ rpc: { validate_coupon: () => [{ valid: false, message: "Este cupom vale apenas na primeira compra." }] } });
      const r = await chamar(corpo({ cupom: "BEMVINDO" }));
      expect(r.status).toBe(400);
      expect(r.json.error).toMatch(/primeira compra/);
      expect(h.db.tabelas.orders).toHaveLength(0);
    });

    it("cupom de valor fixo nunca deixa o total negativo", async () => {
      h.db = novoBanco({ rpc: { validate_coupon: () => [{ valid: true, discount_type: "fixed", discount_value: 500 }] } });
      await chamar(corpo({ cupom: "GRANDE" }));
      expect(h.db.tabelas.orders[0]).toMatchObject({ desconto: 100, total: 0 });
    });
  });
});
