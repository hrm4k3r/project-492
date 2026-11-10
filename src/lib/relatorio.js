// Relatório geral de vendas (site + balcão). Lógica pura: recebe as linhas já buscadas no banco.
// Conta como venda: pedido do site pago/preparando/enviado/entregue e venda do balcão concluída.
// Pedido aguardando pagamento e cancelado (site ou balcão) ficam de fora do faturamento.

export const CONFIRMADOS = ["pago", "preparando", "enviado", "entregue"];

const arred = (n) => Math.round(n * 100) / 100;

// "2026-11-07" no fuso do navegador (o dia que o lojista enxerga).
export function diaLocal(valor) {
  const d = new Date(valor);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Todos os dias de "de" até "ate" (inclusive), para o gráfico não pular dias sem venda.
export function diasDoPeriodo(de, ate) {
  const dias = [];
  const fim = new Date(`${ate}T12:00:00`);
  for (let d = new Date(`${de}T12:00:00`); d <= fim; d.setDate(d.getDate() + 1)) dias.push(diaLocal(d));
  return dias;
}

function doSite(p) {
  return {
    canal: "site",
    id: p.id,
    numero: `#${String(p.id).slice(0, 8)}`,
    data: p.created_at,
    cliente: p.profiles?.full_name ?? "",
    forma: "Site (Mercado Pago)",
    subtotal: Number(p.subtotal ?? 0),
    desconto: Number(p.desconto ?? 0) + Number(p.desconto_pix ?? 0),
    frete: Number(p.frete ?? 0),
    total: Number(p.total ?? 0),
    itens: (p.order_items ?? []).map((i) => ({ titulo: i.titulo, quantidade: i.quantidade, subtotal: Number(i.subtotal) })),
  };
}

function doBalcao(v) {
  return {
    canal: "loja",
    id: v.id,
    numero: `L-${String(v.id).slice(0, 6)}`,
    data: v.created_at,
    cliente: v.cliente ?? "",
    forma: v.forma_pagamento,
    subtotal: Number(v.subtotal ?? 0),
    desconto: Number(v.desconto ?? 0),
    frete: 0,
    total: Number(v.total ?? 0),
    itens: (v.vendas_balcao_itens ?? []).map((i) => ({ titulo: i.titulo, quantidade: i.quantidade, subtotal: Number(i.subtotal) })),
  };
}

export function consolidar({ pedidos = [], vendasBalcao = [], de, ate } = {}) {
  const vendas = [
    ...pedidos.filter((p) => CONFIRMADOS.includes(p.status)).map(doSite),
    ...vendasBalcao.filter((v) => v.status === "concluida").map(doBalcao),
  ].sort((a, b) => new Date(b.data) - new Date(a.data));

  const faturamento = arred(vendas.reduce((t, v) => t + v.total, 0));
  const qtd = vendas.length;

  const porCanal = { site: { valor: 0, qtd: 0 }, loja: { valor: 0, qtd: 0 } };
  for (const v of vendas) {
    porCanal[v.canal].valor = arred(porCanal[v.canal].valor + v.total);
    porCanal[v.canal].qtd += 1;
  }

  const mapaDias = {};
  for (const dia of de && ate ? diasDoPeriodo(de, ate) : []) mapaDias[dia] = { dia, site: 0, loja: 0 };
  for (const v of vendas) {
    const dia = diaLocal(v.data);
    const linha = (mapaDias[dia] ??= { dia, site: 0, loja: 0 });
    linha[v.canal] = arred(linha[v.canal] + v.total);
  }
  const porDia = Object.values(mapaDias).sort((a, b) => a.dia.localeCompare(b.dia));

  // Valor dos produtos antes do desconto do cupom/PDV (o desconto aparece à parte).
  const mapaProdutos = {};
  for (const v of vendas)
    for (const i of v.itens) {
      const p = (mapaProdutos[i.titulo] ??= { titulo: i.titulo, qtd: 0, valor: 0, site: 0, loja: 0 });
      p.qtd += i.quantidade;
      p.valor = arred(p.valor + i.subtotal);
      p[v.canal] += i.quantidade;
    }
  const produtos = Object.values(mapaProdutos).sort((a, b) => b.qtd - a.qtd || b.valor - a.valor);

  const porFormaLoja = {};
  for (const v of vendas) if (v.canal === "loja") porFormaLoja[v.forma] = arred((porFormaLoja[v.forma] ?? 0) + v.total);

  return {
    vendas,
    faturamento,
    qtd,
    ticketMedio: qtd ? arred(faturamento / qtd) : 0,
    descontos: arred(vendas.reduce((t, v) => t + v.desconto, 0)),
    fretes: arred(vendas.reduce((t, v) => t + v.frete, 0)),
    porCanal,
    porDia,
    produtos,
    porFormaLoja,
    aguardando: pedidos.filter((p) => p.status === "pendente").length,
    cancelados:
      pedidos.filter((p) => p.status === "cancelado").length +
      vendasBalcao.filter((v) => v.status === "cancelada").length,
  };
}

const ROTULO_FORMA = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };
export const nomeDaForma = (f) => ROTULO_FORMA[f] ?? f;

const escapar = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const moeda = (n) => Number(n).toFixed(2).replace(".", ",");

// CSV de uma linha por venda, no formato que o Excel brasileiro abre (; e BOM).
export function vendasParaCSV(vendas) {
  const cab = ["Data", "Hora", "Canal", "Número", "Cliente", "Forma de pagamento", "Itens", "Subtotal", "Desconto", "Frete", "Total"];
  const linhas = vendas.map((v) => {
    const d = new Date(v.data);
    return [
      d.toLocaleDateString("pt-BR"),
      d.toLocaleTimeString("pt-BR"),
      v.canal === "site" ? "Site" : "Loja",
      v.numero,
      v.cliente,
      nomeDaForma(v.forma),
      v.itens.map((i) => `${i.quantidade}x ${i.titulo}`).join(" | "),
      moeda(v.subtotal),
      moeda(v.desconto),
      moeda(v.frete),
      moeda(v.total),
    ];
  });
  return `﻿${[cab, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n")}\r\n`;
}
