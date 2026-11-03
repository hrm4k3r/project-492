// Entrega por motoboy: vale só para endereços da cidade configurada em Admin > Configurações.
export const MOTOBOY_SERVICO = "Entrega por motoboy";

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function mesmaCidade(a, b) {
  const x = normalizar(a);
  return x !== "" && x === normalizar(b);
}

// Valores usados enquanto nada foi salvo em Admin > Configurações.
export const MOTOBOY_PADRAO = { preco: 15, cidade: "São Lourenço" };
