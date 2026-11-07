import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));

import {
  escaparHtml,
  destinosDoAviso,
  enviarEmailConfirmacaoPedido,
  enviarEmailAtualizacaoStatus,
  enviarEmailPedidoRecebido,
  enviarEmailNovoPedidoParaLoja,
  enviarEmailEstoqueBaixo,
  modalidadeDoPedido,
  textosDoStatus,
} from "../../src/lib/email";

describe("escaparHtml", () => {
  it("neutraliza tags, aspas e &", () => {
    expect(escaparHtml(`<img src=x onerror="a()"> & 'b'`)).toBe(
      "&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;b&#39;"
    );
    expect(escaparHtml(null)).toBe("");
  });
});

describe("e-mail de confirmação", () => {
  let enviado;
  beforeEach(() => {
    enviado = null;
    global.fetch = vi.fn(async (_url, opcoes) => {
      enviado = JSON.parse(opcoes.body);
      return { ok: true };
    });
    h.db = criarBanco({
      tokens: { t: { id: "u1", email: "cli@teste.com" } },
      tabelas: {
        orders: [{
          id: "12345678-aaaa", profile_id: "u1", subtotal: 10, frete: 0, desconto: 0, total: 10,
          frete_servico: "Retirada no local",
          profiles: { full_name: "<script>alert(1)</script> Silva", phone: null },
          addresses: null,
          order_items: [{ id: "i1", quantidade: 1, titulo: "<b>Vinho</b>", subtotal: 10 }],
        }],
      },
    });
  });

  it("não deixa HTML digitado por cliente ou admin chegar cru no e-mail", async () => {
    await enviarEmailConfirmacaoPedido("12345678-aaaa");
    expect(enviado.html).not.toContain("<script>");
    expect(enviado.html).not.toContain("<b>Vinho</b>");
    expect(enviado.html).toContain("&lt;b&gt;Vinho&lt;/b&gt;");
  });
});

function pedido(extra = {}) {
  return {
    id: "abcdef12-0000", profile_id: "u1", subtotal: 100, frete: 0, desconto: 0, total: 100,
    frete_servico: "PAC", codigo_rastreio: null,
    profiles: { full_name: "Ana Souza", phone: "35999990000" },
    addresses: { street: "Rua A", number: "10", neighborhood: "Centro", city: "São Lourenço", state: "MG", cep: "37470000" },
    order_items: [{ id: "i1", quantidade: 1, titulo: "Vinho", subtotal: 100 }],
    ...extra,
  };
}

describe("e-mails de compra por modalidade", () => {
  let enviados;
  beforeEach(() => {
    enviados = [];
    global.fetch = vi.fn(async (_url, opcoes) => {
      enviados.push(JSON.parse(opcoes.body));
      return { ok: true };
    });
  });
  const banco = (order) =>
    (h.db = criarBanco({ tokens: { t: { id: "u1", email: "cli@teste.com" } }, tabelas: { orders: [order] } }));

  it("identifica a modalidade pelo serviço gravado", () => {
    expect(modalidadeDoPedido({ frete_servico: "Retirada no local" })).toBe("retirada");
    expect(modalidadeDoPedido({ frete_servico: "Entrega por motoboy" })).toBe("motoboy");
    expect(modalidadeDoPedido({ frete_servico: "SEDEX" })).toBe("entrega");
  });

  it("'enviado' muda de texto conforme a modalidade", () => {
    expect(textosDoStatus("enviado", "retirada").titulo).toMatch(/pronto para retirada/i);
    expect(textosDoStatus("enviado", "motoboy").mensagem).toMatch(/motoboy/i);
    expect(textosDoStatus("enviado", "entrega").mensagem).toMatch(/rastreamento/i);
    expect(textosDoStatus("cancelado", "retirada").titulo).toMatch(/cancelado/i);
  });

  it("retirada não fala em rastreamento nem em entrega", async () => {
    banco(pedido({ frete_servico: "Retirada no local", addresses: null }));
    await enviarEmailAtualizacaoStatus("abcdef12-0000", "enviado");
    expect(enviados[0].subject).toMatch(/pronto para retirada/i);
    expect(enviados[0].html).not.toMatch(/rastreamento|saiu para entrega/i);
  });

  it("entrega por transportadora mostra o código de rastreio (escapado)", async () => {
    banco(pedido({ codigo_rastreio: "BR1<b>23" }));
    await enviarEmailAtualizacaoStatus("abcdef12-0000", "enviado");
    expect(enviados[0].html).toContain("BR1&lt;b&gt;23");
    expect(enviados[0].html).not.toContain("BR1<b>23");
  });

  it("motoboy e retirada não mostram caixa de rastreio mesmo com código salvo", async () => {
    banco(pedido({ frete_servico: "Entrega por motoboy", codigo_rastreio: "XYZ999" }));
    await enviarEmailAtualizacaoStatus("abcdef12-0000", "enviado");
    expect(enviados[0].html).not.toContain("XYZ999");
  });

  it("pedido recebido leva o link de volta ao pagamento", async () => {
    banco(pedido());
    await enviarEmailPedidoRecebido("abcdef12-0000");
    expect(enviados[0].subject).toMatch(/Recebemos o seu pedido/);
    expect(enviados[0].html).toContain("/pagamento/abcdef12-0000");
  });

  describe("aviso para a loja", () => {
    afterEach(() => { delete process.env.EMAIL_AVISO_LOJA; });

    it("não envia nada se EMAIL_AVISO_LOJA não estiver definido", async () => {
      banco(pedido());
      await enviarEmailNovoPedidoParaLoja("abcdef12-0000");
      expect(enviados).toHaveLength(0);
    });

    it("envia para todos os e-mails configurados", async () => {
      process.env.EMAIL_AVISO_LOJA = "loja@x.com, dono@x.com";
      banco(pedido());
      await enviarEmailNovoPedidoParaLoja("abcdef12-0000");
      expect(enviados).toHaveLength(1);
      expect(enviados[0].to).toEqual(["loja@x.com", "dono@x.com"]);
      expect(enviados[0].subject).toMatch(/Novo pedido pago/);

      await enviarEmailNovoPedidoParaLoja("abcdef12-0000", { pago: false });
      expect(enviados[1].subject).toMatch(/aguardando pagamento/);
      expect(enviados[0].subject).toMatch(/Novo pedido pago/);
    });
  });

  describe("aviso de estoque baixo", () => {
    afterEach(() => { delete process.env.EMAIL_AVISO_LOJA; });
    const produtos = [
      { produto: "Vinho <b>Tinto</b>", estoque: 2, estoque_minimo: 5 },
      { produto: "Cerveja IPA", estoque: 0, estoque_minimo: 3 },
    ];

    it("não envia sem EMAIL_AVISO_LOJA nem sem produtos", async () => {
      await enviarEmailEstoqueBaixo(produtos);
      process.env.EMAIL_AVISO_LOJA = "dono@x.com";
      await enviarEmailEstoqueBaixo([]);
      expect(enviados).toHaveLength(0);
    });

    it("lista os produtos, marca esgotado e escapa o nome", async () => {
      process.env.EMAIL_AVISO_LOJA = "dono@x.com";
      await enviarEmailEstoqueBaixo(produtos);
      expect(enviados).toHaveLength(1);
      expect(enviados[0].subject).toMatch(/2 produtos para repor/);
      expect(enviados[0].html).toContain("Esgotado");
      expect(enviados[0].html).toContain("restam <strong>2</strong>");
      expect(enviados[0].html).not.toContain("<b>Tinto</b>");
    });
  });
});

describe("destinosDoAviso", () => {
  it("aceita vírgula, ponto e vírgula, espaço e quebra de linha", () => {
    expect(destinosDoAviso("a@x.com, b@y.com")).toEqual(["a@x.com", "b@y.com"]);
    expect(destinosDoAviso("a@x.com; b@y.com")).toEqual(["a@x.com", "b@y.com"]);
    expect(destinosDoAviso("a@x.com;b@y.com ; ")).toEqual(["a@x.com", "b@y.com"]);
    expect(destinosDoAviso("a@x.com\nb@y.com")).toEqual(["a@x.com", "b@y.com"]);
    expect(destinosDoAviso("")).toEqual([]);
    expect(destinosDoAviso(undefined)).toEqual([]);
  });
});
