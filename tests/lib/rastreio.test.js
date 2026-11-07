import { describe, it, expect } from "vitest";
import { linkRastreio, normalizarCodigo } from "../../src/lib/rastreio";

describe("rastreio", () => {
  it("monta o link dos Correios para o código padrão, ignorando espaços e minúsculas", () => {
    expect(linkRastreio("AA123456789BR")).toBe("https://rastreamento.correios.com.br/app/index.php?objetos=AA123456789BR");
    expect(linkRastreio(" ab 123456789 br ")).toBe("https://rastreamento.correios.com.br/app/index.php?objetos=AB123456789BR");
  });

  it("não inventa link para outros códigos nem para valores vazios", () => {
    expect(linkRastreio("14012345678901")).toBeNull();
    expect(linkRastreio("AA1234BR")).toBeNull();
    expect(linkRastreio("AA123456789BR; drop")).toBeNull();
    expect(linkRastreio("")).toBeNull();
    expect(linkRastreio(null)).toBeNull();
    expect(normalizarCodigo(undefined)).toBe("");
  });
});
