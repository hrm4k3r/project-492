import { describe, it, expect } from "vitest";
import { consolidar, diasDoPeriodo, vendasParaCSV, diaLocal } from "../../src/lib/relatorio";

const pedido = (id, extra = {}) => ({
  id, status: "pago", subtotal: 100, desconto: 10, frete: 15, total: 105, created_at: "2026-11-05T15:00:00",
  profiles: { full_name: "Ana" },
  order_items: [{ titulo: "Vinho", quantidade: 2, subtotal: 100 }],
  ...extra,
});
const balcao = (id, extra = {}) => ({
  id, status: "concluida", forma_pagamento: "pix", cliente: null, subtotal: 50, desconto: 0, total: 50,
  created_at: "2026-11-06T10:00:00",
  vendas_balcao_itens: [{ titulo: "Vinho", quantidade: 1, subtotal: 50 }, { titulo: "Queijo", quantidade: 3, subtotal: 60 }],
  ...extra,
});

describe("consolidar", () => {
  const r = consolidar({
    pedidos: [
      pedido("aaaaaaaa-1"),
      pedido("aaaaaaaa-2", { status: "pendente" }),
      pedido("aaaaaaaa-3", { status: "cancelado" }),
      pedido("aaaaaaaa-4", { status: "entregue", total: 200, desconto: 0, frete: 0, subtotal: 200, created_at: "2026-11-06T09:00:00" }),
    ],
    vendasBalcao: [balcao("bbbbbbbb-1"), balcao("bbbbbbbb-2", { status: "cancelada" })],
    de: "2026-11-04",
    ate: "2026-11-07",
  });

  it("soma só vendas confirmadas do site e concluídas do balcão", () => {
    expect(r.qtd).toBe(3);
    expect(r.faturamento).toBe(355);
    expect(r.porCanal).toEqual({ site: { valor: 305, qtd: 2 }, loja: { valor: 50, qtd: 1 } });
    expect(r.aguardando).toBe(1);
    expect(r.cancelados).toBe(2);
  });

  it("calcula ticket médio, descontos e fretes", () => {
    expect(r.ticketMedio).toBe(118.33);
    expect(r.descontos).toBe(10);
    expect(r.fretes).toBe(15);
  });

  it("agrupa por dia, incluindo dias sem venda, separado por canal", () => {
    expect(r.porDia.map((d) => d.dia)).toEqual(["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
    expect(r.porDia[0]).toMatchObject({ site: 0, loja: 0 });
    expect(r.porDia[1]).toMatchObject({ site: 105, loja: 0 });
    expect(r.porDia[2]).toMatchObject({ site: 200, loja: 50 });
  });

  it("junta os produtos dos dois canais e ordena pelos mais vendidos", () => {
    expect(r.produtos[0]).toMatchObject({ titulo: "Vinho", qtd: 5, site: 4, loja: 1, valor: 250 });
    expect(r.produtos[1]).toMatchObject({ titulo: "Queijo", qtd: 3, site: 0, loja: 3, valor: 60 });
  });

  it("separa o balcão por forma de pagamento", () => {
    expect(r.porFormaLoja).toEqual({ pix: 50 });
  });

  it("período sem vendas não quebra (ticket zero)", () => {
    const vazio = consolidar({ de: "2026-11-01", ate: "2026-11-02" });
    expect(vazio).toMatchObject({ qtd: 0, faturamento: 0, ticketMedio: 0 });
    expect(vazio.porDia).toHaveLength(2);
  });
});

describe("diasDoPeriodo e diaLocal", () => {
  it("lista os dias inclusive e atravessa a virada de mês", () => {
    expect(diasDoPeriodo("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(diaLocal("2026-11-05T15:00:00")).toBe("2026-11-05");
  });
});

describe("vendasParaCSV", () => {
  it("gera uma linha por venda com BOM, ; e valores com vírgula", () => {
    const csv = vendasParaCSV(consolidar({ pedidos: [pedido("aaaaaaaa-1")], vendasBalcao: [] }).vendas);
    const linhas = csv.replace("﻿", "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toContain('"Canal";"Número"');
    expect(linhas[1]).toContain('"Site";"#aaaaaaaa"');
    expect(linhas[1]).toContain('"105,00"');
    expect(linhas[1]).toContain("2x Vinho");
  });
});
