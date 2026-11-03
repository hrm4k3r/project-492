import { describe, it, expect } from "vitest";
import { documentoValido, somenteDigitos } from "../../src/lib/documento";

describe("documentoValido", () => {
  it("aceita CPF válido, com ou sem máscara", () => {
    expect(documentoValido("529.982.247-25")).toBe(true);
    expect(documentoValido("52998224725")).toBe(true);
  });

  it("aceita CNPJ válido, com ou sem máscara", () => {
    expect(documentoValido("11.222.333/0001-81")).toBe(true);
    expect(documentoValido("11222333000181")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(documentoValido("529.982.247-24")).toBe(false);
    expect(documentoValido("11.222.333/0001-80")).toBe(false);
  });

  it("recusa sequências repetidas, mesmo que passem na conta", () => {
    expect(documentoValido("111.111.111-11")).toBe(false);
    expect(documentoValido("00000000000000")).toBe(false);
  });

  it("recusa tamanho errado, vazio e nulo", () => {
    expect(documentoValido("1234567890")).toBe(false);
    expect(documentoValido("")).toBe(false);
    expect(documentoValido(null)).toBe(false);
    expect(documentoValido(undefined)).toBe(false);
  });
});

describe("somenteDigitos", () => {
  it("remove tudo que não é dígito", () => {
    expect(somenteDigitos("529.982.247-25")).toBe("52998224725");
    expect(somenteDigitos(null)).toBe("");
  });
});
