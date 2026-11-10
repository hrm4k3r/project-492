import { describe, it, expect } from "vitest";
import { ehCerveja, FAIXAS_TEOR, FAIXAS_IBU, naFaixa, lerTeor, lerIbu, formatarTeor } from "../../src/lib/cerveja";

const faixaDe = (faixas, valor) => faixas.find((f) => naFaixa(valor, f))?.id;

describe("ehCerveja", () => {
  it("reconhece as categorias de cerveja", () => {
    expect(ehCerveja("cervejas-nacionais")).toBe(true);
    expect(ehCerveja("cervejas-importadas")).toBe(true);
    expect(ehCerveja("vinhos")).toBe(false);
    expect(ehCerveja(null)).toBe(false);
  });
});

describe("faixas", () => {
  it("teor alcoólico cai em exatamente uma faixa, inclusive nos limites", () => {
    expect(faixaDe(FAIXAS_TEOR, 0)).toBe("ate-4-5");
    expect(faixaDe(FAIXAS_TEOR, 4.5)).toBe("ate-4-5");
    expect(faixaDe(FAIXAS_TEOR, 4.6)).toBe("4-6");
    expect(faixaDe(FAIXAS_TEOR, 6)).toBe("4-6");
    expect(faixaDe(FAIXAS_TEOR, 6.1)).toBe("6-8");
    expect(faixaDe(FAIXAS_TEOR, 8)).toBe("6-8");
    expect(faixaDe(FAIXAS_TEOR, 8.1)).toBe("8-mais");
    expect(faixaDe(FAIXAS_TEOR, 11.5)).toBe("8-mais");
    for (const v of [0, 3.2, 4.5, 4.6, 5, 6, 6.1, 7.9, 8, 8.1, 12]) {
      expect(FAIXAS_TEOR.filter((f) => naFaixa(v, f))).toHaveLength(1);
    }
  });

  it("IBU cai em exatamente uma faixa", () => {
    expect(faixaDe(FAIXAS_IBU, 0)).toBe("suave");
    expect(faixaDe(FAIXAS_IBU, 20)).toBe("suave");
    expect(faixaDe(FAIXAS_IBU, 21)).toBe("medio");
    expect(faixaDe(FAIXAS_IBU, 40)).toBe("medio");
    expect(faixaDe(FAIXAS_IBU, 41)).toBe("amargo");
    expect(faixaDe(FAIXAS_IBU, 60)).toBe("amargo");
    expect(faixaDe(FAIXAS_IBU, 61)).toBe("muito-amargo");
    expect(faixaDe(FAIXAS_IBU, 100)).toBe("muito-amargo");
  });

  it("produto sem o dado não entra em nenhuma faixa", () => {
    expect(faixaDe(FAIXAS_TEOR, null)).toBeUndefined();
    expect(faixaDe(FAIXAS_IBU, undefined)).toBeUndefined();
    expect(faixaDe(FAIXAS_IBU, "")).toBeUndefined();
  });
});

describe("lerTeor / lerIbu / formatarTeor", () => {
  it("aceita vírgula e % e rejeita o inválido", () => {
    expect(lerTeor("5,5")).toBe(5.5);
    expect(lerTeor(" 7.25% ")).toBe(7.3);
    expect(lerTeor("")).toBeNull();
    expect(lerTeor("abc")).toBeNull();
    expect(lerTeor("120")).toBeNull();
    expect(lerTeor("-1")).toBeNull();
    expect(lerIbu("35")).toBe(35);
    expect(lerIbu("35,6")).toBe(36);
    expect(lerIbu("")).toBeNull();
    expect(lerIbu("999")).toBeNull();
  });

  it("mostra o teor com vírgula", () => {
    expect(formatarTeor(5)).toBe("5,0%");
    expect(formatarTeor(8.5)).toBe("8,5%");
    expect(formatarTeor(null)).toBe("");
  });
});
