import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ calcular: vi.fn() }));
vi.mock("../../src/lib/melhorenvio", () => ({ calcularFrete: (...a) => h.calcular(...a) }));

import { cotarFrete } from "../../src/lib/frete";

const db = () => criarBanco({
  tabelas: {
    produtos: [{ id: "p1", valor: 50, peso_kg: 1, altura_cm: 25, largura_cm: 16, comprimento_cm: 23 }],
    freight_rules: [{ regiao: "Demais estados", estados: [], preco: 55, prazo_dias: 12, ativo: true, ordem: 1 }],
  },
});

beforeEach(() => {
  h.calcular.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = vi.fn(async () => ({ json: async () => ({ uf: "BA" }) }));
});

describe("cotarFrete", () => {
  it("devolve todas as transportadoras disponíveis, da mais barata à mais cara, sem as com erro", async () => {
    h.calcular.mockResolvedValue([
      { name: "SEDEX", company: { name: "Correios" }, price: "22.72", delivery_time: 3 },
      { name: "PAC", company: { name: "Correios" }, price: "19.69", delivery_time: 7 },
      { name: "Mini Envios", company: { name: "Correios" }, error: "Dimensões excedem." },
      { name: "Rodoviário", company: { name: "Buslog" }, price: "25.02", delivery_time: 4 },
    ]);
    const r = await cotarFrete(db(), "11040002", [{ id: "p1", quantidade: 1 }]);
    expect(r.opcoes.map((o) => o.servico)).toEqual(["Correios PAC", "Correios SEDEX", "Buslog Rodoviário"]);
    expect(r.aviso).toBeUndefined();
  });

  it("CEP recusado pelo Melhor Envio (422) vira aviso ao cliente, sem tabela fixa", async () => {
    const erro = Object.assign(new Error("The given data was invalid."), { status: 422 });
    h.calcular.mockRejectedValue(erro);
    await expect(cotarFrete(db(), "40020000", [{ id: "p1", quantidade: 1 }])).rejects.toThrow(/Não encontramos esse CEP/);
  });

  it("pane do Melhor Envio (erro 500 ou rede) continua usando a tabela fixa como reserva", async () => {
    h.calcular.mockRejectedValue(Object.assign(new Error("indisponível"), { status: 503 }));
    const r = await cotarFrete(db(), "40020000", [{ id: "p1", quantidade: 1 }]);
    expect(r.opcoes).toEqual([{ servico: "Demais estados", preco: 55, prazoDias: 12, origem: "tabela" }]);
    expect(r.aviso).toMatch(/Frete estimado/);
  });
});
