// Frete grátis com valor mínimo geral e, opcionalmente, um valor diferente por região do Brasil.
// Usado pelo servidor (/api/pedidos/criar) e pelo carrinho: as duas pontas precisam dar o mesmo resultado.
//
// Regra: a região do endereço de entrega, se tiver valor próprio, SUBSTITUI o valor geral
// (0 = sem frete grátis nessa região). Região sem valor próprio ou endereço ainda não escolhido
// usam o valor geral (0 = sem frete grátis).

export const REGIOES = [
  { id: "norte", nome: "Norte", ufs: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"] },
  { id: "nordeste", nome: "Nordeste", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  { id: "centro-oeste", nome: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"] },
  { id: "sudeste", nome: "Sudeste", ufs: ["ES", "MG", "RJ", "SP"] },
  { id: "sul", nome: "Sul", ufs: ["PR", "RS", "SC"] },
];

export function regiaoDaUF(uf) {
  const sigla = String(uf ?? "").trim().toUpperCase();
  return REGIOES.find((r) => r.ufs.includes(sigla)) ?? null;
}

// Aceita só regiões conhecidas com número >= 0; qualquer outra coisa vira "sem regra própria".
export function normalizarRegioes(valor) {
  const saida = {};
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return saida;
  for (const { id } of REGIOES) {
    const n = valor[id];
    if (n === undefined || n === null || n === "") continue;
    const num = Number(n);
    if (Number.isFinite(num) && num >= 0) saida[id] = num;
  }
  return saida;
}

// Valor mínimo (em R$) para o frete ser grátis neste endereço. 0 = não há frete grátis.
export function limiteFreteGratis({ uf, geral, regioes }) {
  const base = Number(geral);
  const padrao = Number.isFinite(base) && base > 0 ? base : 0;
  const regiao = regiaoDaUF(uf);
  if (!regiao) return padrao;
  const propria = normalizarRegioes(regioes)[regiao.id];
  return propria === undefined ? padrao : propria;
}

export const freteGratis = (subtotal, limite) => limite > 0 && subtotal >= limite;

// Texto curto para banners e perguntas frequentes. "formatar" recebe um número e devolve "R$ 500,00".
export function descreverFreteGratis({ geral, regioes }, formatar) {
  const proprias = normalizarRegioes(regioes);
  const g = Number(geral) > 0 ? Number(geral) : 0;
  const lista = REGIOES.filter((r) => proprias[r.id] !== undefined);

  if (lista.length === 0) return g > 0 ? `Frete grátis acima de ${formatar(g)}` : "";

  const partes = lista
    .filter((r) => proprias[r.id] > 0)
    .map((r) => `${r.nome} acima de ${formatar(proprias[r.id])}`);
  const resto = g > 0 ? `demais regiões acima de ${formatar(g)}` : "";
  const todas = [...partes, resto].filter(Boolean);
  return todas.length ? `Frete grátis: ${todas.join(" · ")}` : "";
}
