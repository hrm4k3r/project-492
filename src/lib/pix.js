// Gerador de Pix estático (BR Code / EMV, especificação do Banco Central).
// Não depende de nenhuma API externa — funciona 100% offline, lido por
// qualquer banco. Referência: manual "Pix – QR Codes" do Bacen.

function tlv(id, value) {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
}

// CRC-16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF, sem reflexão.
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const semAcento = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "");

/**
 * Gera o "Pix Copia e Cola" (BR Code) para um pagamento com valor definido.
 */
export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid }) {
  const merchantAccountInfo =
    tlv("00", "BR.GOV.BCB.PIX") +
    tlv("01", chave) +
    tlv("02", "Fazenda Santo Antonio".slice(0, 40));

  const valorFormatado = Number(valor).toFixed(2);

  const txidLimpo = (txid || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";
  const additionalData = tlv("05", txidLimpo);

  const nomeFormatado = semAcento(nome).slice(0, 25) || "FAZENDA SANTO ANTONIO";
  const cidadeFormatada = semAcento(cidade).slice(0, 15) || "ALAGOA";

  let payload =
    tlv("00", "01") +
    tlv("26", merchantAccountInfo) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", valorFormatado) +
    tlv("58", "BR") +
    tlv("59", nomeFormatado) +
    tlv("60", cidadeFormatada) +
    tlv("62", additionalData);

  payload += "6304";
  const crc = crc16(payload);

  return payload + crc;
}
