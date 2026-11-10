import { describe, it, expect } from "vitest";
import { ESCOPOS } from "../../src/lib/melhorenvio";

describe("permissões pedidas ao Melhor Envio", () => {
  const lista = ESCOPOS.split(" ");

  it("inclui o que a etiqueta precisa: pagar, gerar, imprimir e ler o envio", () => {
    for (const escopo of ["shipping-checkout", "shipping-generate", "shipping-print", "orders-read", "cart-write", "shipping-calculate", "shipping-tracking"]) {
      expect(lista).toContain(escopo);
    }
  });

  it("não repete permissões", () => {
    expect(new Set(lista).size).toBe(lista.length);
  });
});
