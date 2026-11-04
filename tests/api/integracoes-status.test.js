import { describe, it, expect, beforeEach, vi } from "vitest";
import { criarBanco, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/bling", () => ({ statusConexao: async () => ({ conectado: true }) }));
vi.mock("../../src/lib/melhorenvio", () => ({ statusConexao: async () => ({ conectado: true }) }));

import { GET as blingStatus } from "../../src/app/api/bling/status/route";
import { GET as melhorEnvioStatus } from "../../src/app/api/melhorenvio/status/route";

const pedir = async (rota, token) =>
  resposta(
    await rota(new Request("https://loja.test/api/status", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }))
  );

beforeEach(() => {
  h.db = criarBanco({
    tokens: { "tok-admin": { id: "adm" }, "tok-cli": { id: "u1" } },
    tabelas: { profiles: [{ id: "adm", role: "admin" }, { id: "u1", role: "customer" }] },
  });
});

describe.each([
  ["bling", blingStatus],
  ["melhorenvio", melhorEnvioStatus],
])("GET /api/%s/status", (_nome, rota) => {
  it("só o admin consulta", async () => {
    expect((await pedir(rota, null)).status).toBe(401);
    expect((await pedir(rota, "tok-cli")).status).toBe(401);
    const r = await pedir(rota, "tok-admin");
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ conectado: true });
  });
});
