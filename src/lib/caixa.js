// Frete por caixa padrão. Produtos cujas medidas cadastradas são IGUAIS às da caixa padrão vão agrupados
// em caixas (até "capacidade" unidades cada); o peso do produto passa a ser o de UMA unidade e cada caixa
// soma o peso da caixa vazia. Produtos com outras medidas seguem como antes (uma entrada por produto).
// capacidade 0 desliga o recurso (volta a multiplicar o produto por unidade).

export const CAIXA_PADRAO = { capacidade: 6, pesoVazia: 0.3, altura: 25, largura: 16, comprimento: 23 };

const arred = (n) => Math.round(n * 100) / 100;

export function normalizarCaixa(valor) {
  const v = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
  const num = (x, padrao, minimo = 0) => {
    const n = Number(x);
    return x !== undefined && x !== null && x !== "" && Number.isFinite(n) && n >= minimo ? n : padrao;
  };
  return {
    capacidade: Math.floor(num(v.capacidade, CAIXA_PADRAO.capacidade)),
    pesoVazia: num(v.pesoVazia, CAIXA_PADRAO.pesoVazia),
    altura: num(v.altura, CAIXA_PADRAO.altura, 1),
    largura: num(v.largura, CAIXA_PADRAO.largura, 1),
    comprimento: num(v.comprimento, CAIXA_PADRAO.comprimento, 1),
  };
}

// Mesmas três medidas, em qualquer ordem (25x16x23 = 16x23x25).
function cabeNaCaixa(p, caixa) {
  const a = [p.altura, p.largura, p.comprimento].map(Number).sort((x, y) => x - y);
  const b = [caixa.altura, caixa.largura, caixa.comprimento].map(Number).sort((x, y) => x - y);
  return a.every((x, i) => Math.abs(x - b[i]) < 0.01);
}

// itens: [{ id, quantidade, valor, peso, altura, largura, comprimento }] (peso em kg, medidas em cm)
// Devolve a lista no formato do Melhor Envio.
export function agruparEmCaixas(itens, caixaCfg) {
  const caixa = normalizarCaixa(caixaCfg);
  const naCaixa = [];
  const saida = [];

  for (const p of itens) {
    if (caixa.capacidade > 0 && cabeNaCaixa(p, caixa)) {
      naCaixa.push(p);
    } else {
      saida.push({
        id: p.id,
        width: p.largura,
        height: p.altura,
        length: p.comprimento,
        weight: p.peso,
        insurance_value: arred(p.valor * p.quantidade),
        quantity: p.quantidade,
      });
    }
  }

  const unidades = naCaixa.reduce((t, p) => t + p.quantidade, 0);
  if (unidades > 0) {
    const caixas = Math.ceil(unidades / caixa.capacidade);
    const pesoTotal = naCaixa.reduce((t, p) => t + p.peso * p.quantidade, 0);
    const valorTotal = naCaixa.reduce((t, p) => t + p.valor * p.quantidade, 0);
    for (let i = 0; i < caixas; i++) {
      saida.push({
        id: `caixa-${i + 1}`,
        width: caixa.largura,
        height: caixa.altura,
        length: caixa.comprimento,
        weight: arred(caixa.pesoVazia + pesoTotal / caixas),
        insurance_value: arred(valorTotal / caixas),
        quantity: 1,
      });
    }
  }

  return saida;
}
