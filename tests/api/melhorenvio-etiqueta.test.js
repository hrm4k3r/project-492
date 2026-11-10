import { describe, it, expect, vi } from "vitest";
import { criarBanco, requisicao, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, preparar: vi.fn(), comprar: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/etiqueta", () => ({
  prepararEtiqueta: (...a) => h.preparar(...a),
  comprarEtiqueta: (...a) => h.comprar(...a),
  atualizarRastreio: vi.fn(),
  urlDaEtiqueta: vi.fn(),
}));

import { POST } from "../../src/app/api/melhorenvio/etiqueta/route";

h.db = criarBanco({
  tokens: { "tok-a": { id: "a1" }, "tok-c": { id: "c1" } },
  tabelas: { profiles: [{ id: "a1", role: "admin" }, { id: "c1", role: "customer" }] },
});
const chamar = async (token, body) => resposta(await POST(requisicao("http://x/api/melhorenvio/etiqueta", { token, body })));

describe("POST /api/melhorenvio/etiqueta", () => {
  it("só admin pode preparar ou comprar", async () => {
    expect((await chamar("tok-c", { orderId: "o1", acao: "comprar" })).status).toBe(401);
    expect((await chamar(undefined, { orderId: "o1", acao: "comprar" })).status).toBe(401);
    expect(h.comprar).not.toHaveBeenCalled();
  });

  it("valida pedido e ação", async () => {
    expect((await chamar("tok-a", { acao: "preparar" })).status).toBe(400);
    expect((await chamar("tok-a", { orderId: "o1", acao: "apagar-tudo" })).status).toBe(400);
  });

  it("executa a ação e devolve o resultado; erro vira 400 com a mensagem", async () => {
    h.preparar.mockResolvedValue({ servico: "Correios PAC", preco: 31.56 });
    expect(await chamar("tok-a", { orderId: "o1", acao: "preparar" })).toEqual({
      status: 200,
      json: { ok: true, servico: "Correios PAC", preco: 31.56 },
    });
    h.comprar.mockRejectedValue(new Error("Saldo insuficiente"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await chamar("tok-a", { orderId: "o1", acao: "comprar" })).toEqual({ status: 400, json: { error: "Saldo insuficiente" } });
  });
});
