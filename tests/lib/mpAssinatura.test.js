import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { assinaturaValida } from "../../src/lib/mpAssinatura";

const SEGREDO = "segredo-de-teste";

function requisicao({ ts = "1700000000", requestId = "req-1", dataId = "ABC123", segredo = SEGREDO, v1 } = {}) {
  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const hash = v1 ?? createHmac("sha256", segredo).update(manifesto).digest("hex");
  return new Request("https://loja.test/api/pagamento/webhook", {
    method: "POST",
    headers: { "x-signature": `ts=${ts},v1=${hash}`, "x-request-id": requestId },
  });
}

describe("assinaturaValida", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SEGREDO;
  });
  afterEach(() => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it("aceita assinatura correta (id alfanumérico entra em minúsculas)", () => {
    expect(assinaturaValida(requisicao(), "ABC123")).toBe(true);
  });

  it("recusa assinatura calculada com outro segredo", () => {
    expect(assinaturaValida(requisicao({ segredo: "outro" }), "ABC123")).toBe(false);
  });

  it("recusa quando o id do pagamento foi trocado", () => {
    expect(assinaturaValida(requisicao(), "999")).toBe(false);
  });

  it("recusa hash adulterado, sem cabeçalho ou sem id", () => {
    expect(assinaturaValida(requisicao({ v1: "00" }), "ABC123")).toBe(false);
    const semCabecalho = new Request("https://loja.test/x", { method: "POST" });
    expect(assinaturaValida(semCabecalho, "ABC123")).toBe(false);
    expect(assinaturaValida(requisicao(), undefined)).toBe(false);
  });

  it("sem segredo configurado, pula a verificação e avisa no log", () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const semAssinatura = new Request("https://loja.test/x", { method: "POST" });
    expect(assinaturaValida(semAssinatura, "1")).toBe(true);
    expect(aviso).toHaveBeenCalled();
  });
});
