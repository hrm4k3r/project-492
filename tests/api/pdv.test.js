import { describe, it, expect, beforeEach, vi } from "vitest";
import { criarBanco, requisicao, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, avisoEstoque: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/email", () => ({ enviarEmailEstoqueBaixo: (...a) => h.avisoEstoque(...a) }));

import { POST as vender } from "../../src/app/api/pdv/vender/route";
import { POST as cancelar } from "../../src/app/api/pdv/cancelar/route";

const tokens = { "tok-admin": { id: "a1" }, "tok-cli": { id: "c1" } };
const perfis = [{ id: "a1", role: "admin" }, { id: "c1", role: "customer" }];

function banco(rpc = {}) {
  h.db = criarBanco({ tokens, tabelas: { profiles: perfis }, rpc });
}
const corpo = (extra = {}) => ({
  itens: [{ id: "p1", quantidade: 2 }], forma: "pix", ...extra,
});
const chamar = async (rota, token, body) => resposta(await rota(requisicao("http://x/api/pdv", { token, body })));

beforeEach(() => {
  h.avisoEstoque.mockReset().mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/pdv/vender", () => {
  it("recusa quem não é admin e quem não está logado", async () => {
    banco();
    expect((await chamar(vender, "tok-cli", corpo())).status).toBe(401);
    expect((await chamar(vender, undefined, corpo())).status).toBe(401);
    expect(h.db.chamadasRpc).toHaveLength(0);
  });

  it("valida itens, quantidade, forma de pagamento e desconto antes de chamar o banco", async () => {
    banco();
    expect((await chamar(vender, "tok-admin", corpo({ itens: [] }))).status).toBe(400);
    expect((await chamar(vender, "tok-admin", corpo({ itens: [{ id: "p1", quantidade: 0 }] }))).status).toBe(400);
    expect((await chamar(vender, "tok-admin", corpo({ itens: [{ id: "p1", quantidade: 1.5 }] }))).status).toBe(400);
    expect((await chamar(vender, "tok-admin", corpo({ forma: "cheque" }))).status).toBe(400);
    expect((await chamar(vender, "tok-admin", corpo({ desconto: -5 }))).status).toBe(400);
    expect(h.db.chamadasRpc).toHaveLength(0);
  });

  it("registra a venda pelo banco sem enviar preço do navegador", async () => {
    banco({ registrar_venda_balcao: () => ({ venda_id: "v1", total: 80, baixos: [] }) });
    const r = await chamar(vender, "tok-admin", corpo({ cliente: "Maria", desconto: 5, preco: 0.01, total: 0.01 }));
    expect(r).toEqual({ status: 200, json: { ok: true, vendaId: "v1", total: 80 } });
    const args = h.db.chamadasRpc[0].args;
    expect(args).toMatchObject({
      p_operador: "a1", p_forma: "pix", p_cliente: "Maria", p_desconto: 5,
      p_itens: [{ produto_id: "p1", quantidade: 2 }],
    });
    expect(JSON.stringify(args)).not.toContain("0.01");
  });

  it("avisa a loja dos produtos que chegaram ao estoque mínimo", async () => {
    const baixos = [{ produto: "Vinho", estoque: 1, estoque_minimo: 2 }];
    banco({ registrar_venda_balcao: () => ({ venda_id: "v1", total: 10, baixos }) });
    await chamar(vender, "tok-admin", corpo());
    expect(h.avisoEstoque).toHaveBeenCalledWith(baixos);
  });

  it("devolve a mensagem de estoque insuficiente (409) e não vaza outros erros do banco", async () => {
    banco({ registrar_venda_balcao: () => ({ __erro: 'Estoque insuficiente de "Vinho": restam 1.' }) });
    const r = await chamar(vender, "tok-admin", corpo());
    expect(r.status).toBe(409);
    expect(r.json.error).toContain("Estoque insuficiente");

    banco({ registrar_venda_balcao: () => ({ __erro: "relation foo does not exist" }) });
    const r2 = await chamar(vender, "tok-admin", corpo());
    expect(r2.status).toBe(500);
    expect(r2.json.error).toBe("Não foi possível registrar a venda.");
  });
});

describe("POST /api/pdv/cancelar", () => {
  it("só admin cancela, e o banco devolve o estoque", async () => {
    banco({ cancelar_venda_balcao: () => null });
    expect((await chamar(cancelar, "tok-cli", { vendaId: "v1" })).status).toBe(401);
    expect((await chamar(cancelar, "tok-admin", {})).status).toBe(400);
    expect(await chamar(cancelar, "tok-admin", { vendaId: "v1" })).toEqual({ status: 200, json: { ok: true } });
    expect(h.db.chamadasRpc[0]).toEqual({ nome: "cancelar_venda_balcao", args: { p_venda_id: "v1" } });
  });

  it("avisa quando a venda já foi cancelada", async () => {
    banco({ cancelar_venda_balcao: () => ({ __erro: "Esta venda já foi cancelada." }) });
    const r = await chamar(cancelar, "tok-admin", { vendaId: "v1" });
    expect(r.status).toBe(409);
  });
});
