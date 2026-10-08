export function destinoSeguro(padrao = "/conta") {
  if (typeof window === "undefined") return padrao;
  const valor = new URLSearchParams(window.location.search).get("voltar");
  if (valor && valor.startsWith("/") && !valor.startsWith("//")) return valor;
  return padrao;
}

export function sufixoVoltar() {
  const destino = destinoSeguro(null);
  return destino ? `?voltar=${encodeURIComponent(destino)}` : "";
}
