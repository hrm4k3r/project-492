import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({ avisos: [] }));
vi.mock("../../src/lib/email", () => ({ enviarEmailEstoqueBaixo: async (p) => { h.avisos.push(p); } }));

import { baixarEstoqueEAvisar } from "../../src/lib/estoque";

beforeEach(() => { h.avisos = []; });

describe("baixarEstoqueEAvisar", () => {
  it("chama a função SQL do pedido e avisa só quando algum produto ficou no mínimo", async () => {
    const ficou = [{ produto_id: "p1", produto: "Vinho", estoque: 1, estoque_minimo: 3 }];
    const db = { rpc: vi.fn(async () => ({ data: ficou, error: null })) };
    await baixarEstoqueEAvisar(db, "o1");
    expect(db.rpc).toHaveBeenCalledWith("baixar_estoque_pedido", { p_order_id: "o1" });
    expect(h.avisos).toEqual([ficou]);

    h.avisos = [];
    await baixarEstoqueEAvisar({ rpc: async () => ({ data: [], error: null }) }, "o2");
    expect(h.avisos).toHaveLength(0);
  });

  it("falha na baixa só é registrada e nunca lança erro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      baixarEstoqueEAvisar({ rpc: async () => ({ data: null, error: { message: "função não existe" } }) }, "o1")
    ).resolves.toBeUndefined();
    await expect(baixarEstoqueEAvisar({ rpc: async () => { throw new Error("rede"); } }, "o1")).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalledTimes(2);
    expect(h.avisos).toHaveLength(0);
  });
});
