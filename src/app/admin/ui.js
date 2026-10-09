export const inputClass =
  "w-full rounded-lg border border-cardBorder bg-white px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-gold";

export const labelClass = "text-[11px] font-medium uppercase tracking-[0.16em] text-primary/60";

export const cardClass = "rounded-2xl border border-cardBorder bg-white p-5 shadow-soft md:p-6";

export const statusInfo = {
  pendente: { label: "Aguardando pagamento", classe: "bg-gold/25 text-terracotta" },
  pago: { label: "Pago", classe: "bg-olive/20 text-olive" },
  preparando: { label: "Preparando", classe: "bg-gold/25 text-primary" },
  enviado: { label: "Enviado", classe: "bg-brand/15 text-brand" },
  entregue: { label: "Entregue", classe: "bg-olive/20 text-olive" },
  cancelado: { label: "Cancelado", classe: "bg-primary/10 text-primary/55" },
};

export function numeroWhatsapp(telefone) {
  const digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
}
