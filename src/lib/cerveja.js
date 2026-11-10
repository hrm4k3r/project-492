// Atributos de cerveja: teor alcoólico (% ABV) e IBU (amargor), com as faixas usadas no filtro da loja.

export const ehCerveja = (categoria) => String(categoria ?? "").startsWith("cervejas");

// Faixas com limite inferior incluso e superior excluso (sem buracos entre elas).
export const FAIXAS_TEOR = [
  { id: "ate-4-5", rotulo: "Até 4,5% (leve)", min: 0, max: 4.6 },
  { id: "4-6", rotulo: "4,6% a 6%", min: 4.6, max: 6.1 },
  { id: "6-8", rotulo: "6,1% a 8%", min: 6.1, max: 8.1 },
  { id: "8-mais", rotulo: "Acima de 8% (forte)", min: 8.1, max: Infinity },
];

export const FAIXAS_IBU = [
  { id: "suave", rotulo: "Suave (até 20)", min: 0, max: 21 },
  { id: "medio", rotulo: "Médio (21 a 40)", min: 21, max: 41 },
  { id: "amargo", rotulo: "Amargo (41 a 60)", min: 41, max: 61 },
  { id: "muito-amargo", rotulo: "Muito amargo (mais de 60)", min: 61, max: Infinity },
];

// Valor ausente nunca cai em faixa nenhuma (produto sem o dado some quando o filtro está ativo).
export function naFaixa(valor, faixa) {
  if (valor === null || valor === undefined || valor === "" || !faixa) return false;
  const n = Number(valor);
  return Number.isFinite(n) && n >= faixa.min && n < faixa.max;
}

// Campo do formulário -> número ou null. Aceita vírgula ("5,5"). Fora da faixa válida vira null.
export function lerTeor(texto) {
  const t = String(texto ?? "").trim().replace(",", ".").replace("%", "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : null;
}

export function lerIbu(texto) {
  const t = String(texto ?? "").trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 200 ? Math.round(n) : null;
}

export const formatarTeor = (n) =>
  n === null || n === undefined || n === "" ? "" : `${Number(n).toFixed(1).replace(".", ",")}%`;
