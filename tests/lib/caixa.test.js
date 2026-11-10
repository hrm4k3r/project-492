import { describe, it, expect } from "vitest";
import { agruparEmCaixas, normalizarCaixa, CAIXA_PADRAO } from "../../src/lib/caixa";

const cerveja = (extra = {}) => ({
  id: "c1", quantidade: 1, valor: 50, peso: 0.925, altura: 25, largura: 16, comprimento: 23, ...extra,
});
const queijo = { id: "q1", quantidade: 2, valor: 40, peso: 0.5, altura: 10, largura: 15, comprimento: 15 };

describe("agruparEmCaixas", () => {
  it("1 unidade = 1 caixa com peso da caixa vazia + peso da unidade", () => {
    const r = agruparEmCaixas([cerveja()], CAIXA_PADRAO);
    expect(r).toEqual([{ id: "caixa-1", width: 16, height: 25, length: 23, weight: 1.23, insurance_value: 50, quantity: 1 }]);
  });

  it("6 unidades continuam em 1 caixa; 7 passam a 2 caixas", () => {
    expect(agruparEmCaixas([cerveja({ quantidade: 6 })], CAIXA_PADRAO)).toHaveLength(1);
    expect(agruparEmCaixas([cerveja({ quantidade: 7 })], CAIXA_PADRAO)).toHaveLength(2);
    expect(agruparEmCaixas([cerveja({ quantidade: 12 })], CAIXA_PADRAO)).toHaveLength(2);
    expect(agruparEmCaixas([cerveja({ quantidade: 13 })], CAIXA_PADRAO)).toHaveLength(3);
  });

  it("6 unidades: peso total = caixa vazia + 6 garrafas; seguro = valor das 6", () => {
    const [caixa] = agruparEmCaixas([cerveja({ quantidade: 6 })], CAIXA_PADRAO);
    expect(caixa.weight).toBe(5.85); // 0,3 + 6 x 0,925
    expect(caixa.insurance_value).toBe(300);
  });

  it("latas e garrafas diferentes no mesmo carrinho dividem as mesmas caixas", () => {
    const r = agruparEmCaixas(
      [cerveja({ id: "lata", quantidade: 3, peso: 0.57, valor: 10 }), cerveja({ id: "garrafa", quantidade: 4, peso: 0.925, valor: 30 })],
      CAIXA_PADRAO
    );
    expect(r).toHaveLength(2); // 7 unidades
    const pesoTotal = r.reduce((t, c) => t + c.weight, 0);
    expect(pesoTotal).toBeCloseTo(2 * 0.3 + 3 * 0.57 + 4 * 0.925, 1);
    expect(r.reduce((t, c) => t + c.insurance_value, 0)).toBeCloseTo(150, 1);
  });

  it("produto com outras medidas segue por unidade e não entra na caixa", () => {
    const r = agruparEmCaixas([cerveja({ quantidade: 2 }), queijo], CAIXA_PADRAO);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.id === "q1")).toEqual({ id: "q1", width: 15, height: 10, length: 15, weight: 0.5, insurance_value: 80, quantity: 2 });
    expect(r.find((x) => x.id === "caixa-1")).toBeTruthy();
  });

  it("reconhece as medidas em outra ordem (16x23x25)", () => {
    const r = agruparEmCaixas([cerveja({ altura: 16, largura: 23, comprimento: 25 })], CAIXA_PADRAO);
    expect(r[0].id).toBe("caixa-1");
  });

  it("capacidade 0 desliga o agrupamento (comportamento antigo)", () => {
    const r = agruparEmCaixas([cerveja({ quantidade: 3 })], { ...CAIXA_PADRAO, capacidade: 0 });
    expect(r).toEqual([{ id: "c1", width: 16, height: 25, length: 23, weight: 0.925, insurance_value: 150, quantity: 3 }]);
  });
});

describe("normalizarCaixa", () => {
  it("sem configuração usa os padrões; lixo ou negativo também", () => {
    expect(normalizarCaixa(undefined)).toEqual(CAIXA_PADRAO);
    expect(normalizarCaixa("x")).toEqual(CAIXA_PADRAO);
    expect(normalizarCaixa({ capacidade: -3, altura: 0, pesoVazia: "abc" })).toEqual(CAIXA_PADRAO);
  });

  it("aceita valores válidos e capacidade 0", () => {
    expect(normalizarCaixa({ capacidade: "4", pesoVazia: "0.5", altura: 20 })).toMatchObject({ capacidade: 4, pesoVazia: 0.5, altura: 20 });
    expect(normalizarCaixa({ capacidade: 0 }).capacidade).toBe(0);
  });
});
