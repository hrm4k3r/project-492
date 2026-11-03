import { describe, it, expect, beforeEach, vi } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));

import { escaparHtml, enviarEmailConfirmacaoPedido } from "../../src/lib/email";

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
