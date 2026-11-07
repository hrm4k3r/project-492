import { describe, it, expect } from "vitest";
import {
  regiaoDaUF, normalizarRegioes, limiteFreteGratis, freteGratis, descreverFreteGratis,
} from "../../src/lib/freteGratis";

const brl = (n) => `R$ ${n}`;

describe("regiaoDaUF", () => {
  it("reconhece as 27 UFs, sem diferenciar maiúsculas e espaços", () => {
    expect(regiaoDaUF("MG").id).toBe("sudeste");
    expect(regiaoDaUF(" sp ").id).toBe("sudeste");
    expect(regiaoDaUF("DF").id).toBe("centro-oeste");
    expect(regiaoDaUF("AM").id).toBe("norte");
    expect(regiaoDaUF("BA").id).toBe("nordeste");
    expect(regiaoDaUF("RS").id).toBe("sul");
    expect(regiaoDaUF("XX")).toBeNull();
    expect(regiaoDaUF(undefined)).toBeNull();
  });
});

describe("limiteFreteGratis", () => {
  const regioes = { sudeste: 500 };

  it("região com valor próprio usa o dela; as outras usam o geral", () => {
    expect(limiteFreteGratis({ uf: "MG", geral: 1000, regioes })).toBe(500);
    expect(limiteFreteGratis({ uf: "SP", geral: 1000, regioes })).toBe(500);
    expect(limiteFreteGratis({ uf: "BA", geral: 1000, regioes })).toBe(1000);
  });

  it("sem endereço ainda (UF vazia) ou UF inválida usa o valor geral", () => {
    expect(limiteFreteGratis({ uf: "", geral: 1000, regioes })).toBe(1000);
    expect(limiteFreteGratis({ uf: "ZZ", geral: 1000, regioes })).toBe(1000);
  });

  it("valor 0 na região desliga o frete grátis só nela; 0 no geral desliga nas demais", () => {
    expect(limiteFreteGratis({ uf: "RJ", geral: 1000, regioes: { sudeste: 0 } })).toBe(0);
    expect(limiteFreteGratis({ uf: "BA", geral: 0, regioes })).toBe(0);
    expect(limiteFreteGratis({ uf: "SP", geral: 0, regioes })).toBe(500);
  });

  it("região pode ter valor MAIOR que o geral (a região substitui, não é o menor dos dois)", () => {
    expect(limiteFreteGratis({ uf: "AM", geral: 300, regioes: { norte: 900 } })).toBe(900);
  });

  it("configuração lixo não quebra nem libera frete", () => {
    expect(limiteFreteGratis({ uf: "SP", geral: 1000, regioes: "abc" })).toBe(1000);
    expect(limiteFreteGratis({ uf: "SP", geral: 1000, regioes: { sudeste: -5 } })).toBe(1000);
    expect(limiteFreteGratis({ uf: "SP", geral: "x", regioes: null })).toBe(0);
  });
});

describe("normalizarRegioes e freteGratis", () => {
  it("mantém só regiões conhecidas com número válido", () => {
    expect(normalizarRegioes({ sudeste: "500", sul: "", norte: null, lua: 10, nordeste: "abc" })).toEqual({ sudeste: 500 });
    expect(normalizarRegioes([1, 2])).toEqual({});
  });

  it("frete grátis quando subtotal atinge o limite (inclusive igual)", () => {
    expect(freteGratis(500, 500)).toBe(true);
    expect(freteGratis(499.99, 500)).toBe(false);
    expect(freteGratis(9999, 0)).toBe(false);
  });
});

describe("descreverFreteGratis", () => {
  it("só valor geral", () => {
    expect(descreverFreteGratis({ geral: 1000, regioes: {} }, brl)).toBe("Frete grátis acima de R$ 1000");
    expect(descreverFreteGratis({ geral: 0, regioes: {} }, brl)).toBe("");
  });

  it("valor por região mais o geral para as demais", () => {
    expect(descreverFreteGratis({ geral: 1000, regioes: { sudeste: 500 } }, brl)).toBe(
      "Frete grátis: Sudeste acima de R$ 500 · demais regiões acima de R$ 1000"
    );
  });

  it("sem geral, só as regiões que têm valor", () => {
    expect(descreverFreteGratis({ geral: 0, regioes: { sudeste: 500, sul: 700 } }, brl)).toBe(
      "Frete grátis: Sudeste acima de R$ 500 · Sul acima de R$ 700"
    );
    expect(descreverFreteGratis({ geral: 0, regioes: { sudeste: 0 } }, brl)).toBe("");
  });
});
