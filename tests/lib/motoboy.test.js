import { describe, it, expect } from "vitest";
import { mesmaCidade, MOTOBOY_PADRAO } from "../../src/lib/motoboy";

describe("mesmaCidade", () => {
  it("ignora acento, caixa e espaços nas pontas", () => {
    expect(mesmaCidade("São Lourenço", "sao lourenco")).toBe(true);
    expect(mesmaCidade("  SÃO LOURENÇO ", "São Lourenço")).toBe(true);
  });

  it("recusa cidades diferentes", () => {
    expect(mesmaCidade("Caxambu", "São Lourenço")).toBe(false);
    expect(mesmaCidade("São Lourenço do Sul", "São Lourenço")).toBe(false);
  });

  it("não considera iguais dois valores vazios", () => {
    expect(mesmaCidade("", "")).toBe(false);
    expect(mesmaCidade(null, undefined)).toBe(false);
  });

  it("o padrão do código é R$ 15 em São Lourenço", () => {
    expect(MOTOBOY_PADRAO).toEqual({ preco: 15, cidade: "São Lourenço" });
  });
});
