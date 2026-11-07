// Link de rastreio para o cliente. Código dos Correios (2 letras + 9 dígitos + 2 letras, ex.: AA123456789BR)
// abre o rastreamento oficial; qualquer outro código (Jadlog, transportadora) não tem link confiável
// e o cliente só vê o código para copiar.
export function normalizarCodigo(codigo) {
  return String(codigo ?? "").replace(/\s+/g, "").toUpperCase();
}

export function linkRastreio(codigo) {
  const c = normalizarCodigo(codigo);
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c)) {
    return `https://rastreamento.correios.com.br/app/index.php?objetos=${c}`;
  }
  return null;
}
