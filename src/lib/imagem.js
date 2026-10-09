// Fotos hospedadas fora do Supabase (links colados na planilha) não passam pelo
// otimizador do Next, que só aceita hosts configurados; elas são exibidas direto.
export const semOtimizar = (src) =>
  typeof src === "string" && /^https?:\/\//i.test(src) && !/\.supabase\.co\//i.test(src);
