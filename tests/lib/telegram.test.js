import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));

import { enviarTelegramNovoPedido, textoNovoPedido, textoEstoqueBaixo, enviarTelegramEstoqueBaixo } from "../../src/lib/telegram";

function pedido(extra = {}) {
  return {
    id: "abcdef12-0000", profile_id: "u1", subtotal: 100, frete: 15, desconto: 0, total: 115,
    frete_servico: "PAC",
    profiles: { full_name: "<b>Ana</b> Souza", phone: "35999990000" },
    addresses: null,
    order_items: [{ id: "i1", quantidade: 2, titulo: "Vinho <i>tinto</i>", subtotal: 100 }],
    ...extra,
  };
}

describe("aviso no Telegram", () => {
  let chamadas;
  const env = { ...process.env };

  beforeEach(() => {
    chamadas = [];
    global.fetch = vi.fn(async (url, opcoes) => {
      chamadas.push({ url, corpo: JSON.parse(opcoes.body) });
      return { ok: true };
    });
    h.db = criarBanco({
      tokens: { t: { id: "u1", email: "cli@teste.com" } },
      tabelas: { orders: [pedido()] },
    });
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });
  afterEach(() => { process.env = { ...env }; });

  it("não faz nada sem token ou sem chat configurados", async () => {
    await enviarTelegramNovoPedido("abcdef12-0000");
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    await enviarTelegramNovoPedido("abcdef12-0000");
    expect(chamadas).toHaveLength(0);
  });

  it("envia para cada chat configurado, com texto diferente para pago e pendente", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "111, 222";

    await enviarTelegramNovoPedido("abcdef12-0000", { pago: false });
    expect(chamadas.map((c) => c.corpo.chat_id)).toEqual(["111", "222"]);
    expect(chamadas[0].url).toContain("/bot123:abc/sendMessage");
    expect(chamadas[0].corpo.text).toContain("aguardando pagamento");

    chamadas.length = 0;
    await enviarTelegramNovoPedido("abcdef12-0000");
    expect(chamadas[0].corpo.text).toContain("Pedido pago");
  });

  it("não deixa HTML digitado pelo cliente chegar cru na mensagem", () => {
    const texto = textoNovoPedido(pedido(), true);
    expect(texto).not.toContain("<b>Ana</b>");
    expect(texto).not.toContain("<i>tinto</i>");
    expect(texto).toContain("&lt;b&gt;Ana&lt;/b&gt;");
  });

  it("falha do Telegram não lança erro", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "111";
    global.fetch = vi.fn(async () => ({ ok: false, status: 400, text: async () => "chat not found" }));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(enviarTelegramNovoPedido("abcdef12-0000")).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalled();
  });
});

describe("aviso de estoque baixo no Telegram", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it("monta a mensagem com esgotado/restam e escapa o nome do produto", () => {
    const texto = textoEstoqueBaixo([
      { produto: "<b>Vinho</b>", estoque: 2, estoque_minimo: 3 },
      { produto: "Queijo", estoque: 0, estoque_minimo: 1 },
    ]);
    expect(texto).toContain("Estes produtos chegaram");
    expect(texto).toContain("&lt;b&gt;Vinho&lt;/b&gt; — restam <b>2</b> (mínimo 3)");
    expect(texto).toContain("Queijo — <b>esgotado</b> (mínimo 1)");
    expect(texto).toContain("/admin/produtos");
  });

  it("só envia com token e chat configurados, a todos os chats", async () => {
    const chamadas = [];
    global.fetch = vi.fn(async (url, opcoes) => { chamadas.push(JSON.parse(opcoes.body)); return { ok: true }; });
    const lista = [{ produto: "Vinho", estoque: 1, estoque_minimo: 3 }];

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    await enviarTelegramEstoqueBaixo(lista);
    expect(chamadas).toHaveLength(0);

    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_CHAT_ID = "1; 2";
    await enviarTelegramEstoqueBaixo(lista);
    expect(chamadas.map((c) => c.chat_id)).toEqual(["1", "2"]);
    await enviarTelegramEstoqueBaixo([]);
    expect(chamadas).toHaveLength(2);
  });
});
