import { describe, it, expect, beforeEach, vi } from "vitest";
import { criarBanco, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, emitidas: [], falha: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/bling", () => ({
  emitirNFe: async (id) => {
    if (h.falha) throw new Error(h.falha);
    h.emitidas.push(id);
    return { id: "123", situacao: "5" };
  },
}));

import { POST } from "../../src/app/api/bling/nfe/route";

const chamar = async (corpo, token) =>
  resposta(
    await POST(new Request("https://loja.test/api/bling/nfe", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo),
    }))
  );

beforeEach(() => {
  h.emitidas = [];
  h.falha = null;
  h.db = criarBanco({
    tokens: { "tok-admin": { id: "adm" }, "tok-cli": { id: "u1" } },
    tabelas: { profiles: [{ id: "adm", role: "admin" }, { id: "u1", role: "customer" }] },
  });
});

describe("POST /api/bling/nfe", () => {
  it("só o admin emite", async () => {
    expect((await chamar({ orderId: "o1" }, null)).status).toBe(401);
    expect((await chamar({ orderId: "o1" }, "tok-cli")).status).toBe(401);
    expect(h.emitidas).toHaveLength(0);
  });

  it("exige o orderId", async () => {
    expect((await chamar({}, "tok-admin")).status).toBe(400);
  });

  it("admin emite e recebe o resultado", async () => {
    const r = await chamar({ orderId: "o1" }, "tok-admin");
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, nfe: { id: "123", situacao: "5" } });
    expect(h.emitidas).toEqual(["o1"]);
  });

  it("erro do Bling volta para o admin saber o que corrigir", async () => {
    h.falha = "Produto(s) sem NCM: Vinho";
    const r = await chamar({ orderId: "o1" }, "tok-admin");
    expect(r.status).toBe(500);
    expect(r.json.error).toBe("Produto(s) sem NCM: Vinho");
  });
});
