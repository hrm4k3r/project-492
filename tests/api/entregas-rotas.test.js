import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { criarBanco, requisicao, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, sincronizar: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/entregas", () => ({ sincronizarEntregas: (...a) => h.sincronizar(...a) }));

import { POST } from "../../src/app/api/melhorenvio/entregas/route";
import { GET } from "../../src/app/api/cron/entregas/route";

h.db = criarBanco({
  tokens: { "tok-a": { id: "a1" }, "tok-c": { id: "c1" } },
  tabelas: { profiles: [{ id: "a1", role: "admin" }, { id: "c1", role: "customer" }] },
});

beforeEach(() => {
  h.sincronizar.mockReset().mockResolvedValue({ verificados: 2, atualizados: [{ id: "a", de: "preparando", para: "enviado" }], erros: 0 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/melhorenvio/entregas (botão do painel)", () => {
  const chamar = async (token) => resposta(await POST(requisicao("http://x/api/melhorenvio/entregas", { token })));

  it("só admin", async () => {
    expect((await chamar("tok-c")).status).toBe(401);
    expect((await chamar(undefined)).status).toBe(401);
    expect(h.sincronizar).not.toHaveBeenCalled();
  });

  it("admin atualiza e recebe o resumo", async () => {
    const r = await chamar("tok-a");
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, verificados: 2, atualizados: [{ id: "a", para: "enviado" }] });
  });

  it("falha mostra a mensagem ao admin", async () => {
    h.sincronizar.mockRejectedValue(new Error("Melhor Envio fora do ar"));
    expect(await chamar("tok-a")).toEqual({ status: 500, json: { error: "Melhor Envio fora do ar" } });
  });
});

describe("GET /api/cron/entregas (verificação diária)", () => {
  const chamar = async (autorizacao) =>
    resposta(await GET(new Request("http://x/api/cron/entregas", { headers: autorizacao ? { authorization: autorizacao } : {} })));

  it("sem CRON_SECRET configurado, recusa tudo", async () => {
    expect((await chamar("Bearer qualquer")).status).toBe(401);
    expect((await chamar("Bearer undefined")).status).toBe(401);
    expect(h.sincronizar).not.toHaveBeenCalled();
  });

  it("com o segredo certo roda; errado ou ausente recusa", async () => {
    process.env.CRON_SECRET = "segredo-do-cron";
    expect((await chamar()).status).toBe(401);
    expect((await chamar("Bearer errado")).status).toBe(401);
    expect(h.sincronizar).not.toHaveBeenCalled();
    const r = await chamar("Bearer segredo-do-cron");
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
  });

  it("erro interno não vaza detalhes", async () => {
    process.env.CRON_SECRET = "s";
    h.sincronizar.mockRejectedValue(new Error("token secreto do ME"));
    const r = await chamar("Bearer s");
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.json)).not.toContain("token secreto");
  });
});
