import { describe, it, expect } from "vitest";
import { calcularDescontoPix, normalizarPercentualPix, valorNoPix, centavosEsperados } from "../../src/lib/pix";

describe("calcularDescontoPix", () => {
  it("5% sobre os produtos já com o cupom, sem o frete", () => {
    expect(calcularDescontoPix({ subtotal: 200, desconto: 20, percentual: 5 })).toBe(9); // 180 x 5%
    expect(calcularDescontoPix({ subtotal: 100, percentual: 5 })).toBe(5);
  });

  it("arredonda para centavos", () => {
    expect(calcularDescontoPix({ subtotal: 15.21, percentual: 5 })).toBe(0.76); // 0,7605
    expect(calcularDescontoPix({ subtotal: 33.33, percentual: 5 })).toBe(1.67);
  });

  it("percentual 0 desliga; sem configuração usa 5%", () => {
    expect(calcularDescontoPix({ subtotal: 100, percentual: 0 })).toBe(0);
    expect(calcularDescontoPix({ subtotal: 100 })).toBe(5);
  });

  it("cupom maior que o subtotal não gera desconto negativo", () => {
    expect(calcularDescontoPix({ subtotal: 50, desconto: 80, percentual: 5 })).toBe(0);
  });
});

describe("normalizarPercentualPix", () => {
  it("aceita 0 a 100; lixo ou fora da faixa vira 0", () => {
    expect(normalizarPercentualPix("7.5")).toBe(7.5);
    expect(normalizarPercentualPix(0)).toBe(0);
    expect(normalizarPercentualPix(150)).toBe(0);
    expect(normalizarPercentualPix(-1)).toBe(0);
    expect(normalizarPercentualPix("abc")).toBe(0);
    expect(normalizarPercentualPix(undefined)).toBe(5);
  });
});

describe("valores do pedido", () => {
  const pedido = { total: 105, desconto_pix: 5 };
  it("Pix paga o total menos o desconto; cartão paga o total", () => {
    expect(valorNoPix(pedido)).toBe(100);
    expect(centavosEsperados(pedido, { payment_method_id: "pix" })).toBe(10000);
    expect(centavosEsperados(pedido, { payment_method_id: "visa" })).toBe(10500);
  });
  it("pedido antigo, sem desconto_pix, não muda de valor", () => {
    expect(centavosEsperados({ total: 105 }, { payment_method_id: "pix" })).toBe(10500);
  });
});
