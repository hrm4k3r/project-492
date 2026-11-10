import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarBanco } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ me: vi.fn(), email: vi.fn() }));
vi.mock("../../src/lib/melhorenvio", () => ({ chamarMelhorEnvio: (...a) => h.me(...a) }));
vi.mock("../../src/lib/email", () => ({ enviarEmailAtualizacaoStatus: (...a) => h.email(...a) }));

import { proximoStatus, sincronizarEntregas } from "../../src/lib/entregas";

const pedido = (id, extra = {}) => ({
  id, status: "preparando", etiqueta_status: "gerada", etiqueta_id: `env-${id}`, codigo_rastreio: null, enviado_em: null, entregue_em: null, ...extra,
});
const banco = (...pedidos) => criarBanco({ tabelas: { orders: pedidos } });
const linha = (db, id) => db.tabelas.orders.find((o) => o.id === id);

beforeEach(() => {
  h.me.mockReset();
  h.email.mockReset().mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("proximoStatus", () => {
  it("avança conforme o andamento do envio", () => {
    expect(proximoStatus("pago", "generated")).toBe("preparando");
    expect(proximoStatus("preparando", "posted")).toBe("enviado");
    expect(proximoStatus("enviado", "delivered")).toBe("entregue");
    expect(proximoStatus("preparando", "delivered")).toBe("entregue"); // pulou a postagem
  });

  it("nunca volta nem repete", () => {
    expect(proximoStatus("enviado", "generated")).toBeNull();
    expect(proximoStatus("entregue", "posted")).toBeNull();
    expect(proximoStatus("enviado", "posted")).toBeNull();
    expect(proximoStatus("preparando", "generated")).toBeNull();
  });

  it("cancelado, não entregue, pendente ou desconhecido ficam com o lojista", () => {
    for (const s of ["canceled", "undelivered", "pending", "expired", "", undefined]) {
      expect(proximoStatus("preparando", s)).toBeNull();
    }
    expect(proximoStatus("cancelado", "delivered")).toBeNull();
    expect(proximoStatus("pendente", "posted")).toBeNull();
  });
});

describe("sincronizarEntregas", () => {
  it("consulta todos os envios numa chamada só e atualiza status, rastreio e datas", async () => {
    const db = banco(pedido("a"), pedido("b", { status: "enviado", codigo_rastreio: "AA1BR", enviado_em: "2026-11-09T10:00:00Z" }));
    h.me.mockResolvedValue({
      "env-a": { status: "posted", tracking: "AA123456789BR", posted_at: "2026-11-10T09:00:00Z" },
      "env-b": { status: "delivered", tracking: "AA1BR", delivered_at: "2026-11-11T15:30:00Z" },
    });
    const r = await sincronizarEntregas(db);

    expect(h.me).toHaveBeenCalledTimes(1);
    expect(h.me.mock.calls[0]).toEqual(["/me/shipment/tracking", { method: "POST", body: { orders: ["env-a", "env-b"] } }]);
    expect(r).toMatchObject({ verificados: 2, erros: 0 });
    expect(r.atualizados).toEqual([{ id: "a", de: "preparando", para: "enviado" }, { id: "b", de: "enviado", para: "entregue" }]);
    expect(linha(db, "a")).toMatchObject({ status: "enviado", codigo_rastreio: "AA123456789BR", enviado_em: "2026-11-10T09:00:00.000Z" });
    expect(linha(db, "b")).toMatchObject({ status: "entregue", enviado_em: "2026-11-09T10:00:00Z", entregue_em: "2026-11-11T15:30:00.000Z" });
  });

  it("envia o e-mail de cada mudança, e só uma vez mesmo se rodar de novo", async () => {
    const db = banco(pedido("a"));
    h.me.mockResolvedValue({ "env-a": { status: "posted", tracking: "AA123456789BR" } });
    await sincronizarEntregas(db);
    await sincronizarEntregas(db);
    expect(h.email).toHaveBeenCalledTimes(1);
    expect(h.email).toHaveBeenCalledWith("a", "enviado");
  });

  it("o código de rastreio é gravado antes do e-mail (o e-mail mostra o código)", async () => {
    const db = banco(pedido("a"));
    let codigoNoEmail;
    h.email.mockImplementation(async (id) => { codigoNoEmail = linha(db, id).codigo_rastreio; });
    h.me.mockResolvedValue({ "env-a": { status: "posted", tracking: "AA123456789BR" } });
    await sincronizarEntregas(db);
    expect(codigoNoEmail).toBe("AA123456789BR");
  });

  it("ignora pedido sem etiqueta gerada, já entregue ou cancelado, e não chama o Melhor Envio se não há nada", async () => {
    const db = banco(pedido("a", { etiqueta_status: "carrinho" }), pedido("b", { status: "entregue" }), pedido("c", { status: "cancelado" }), pedido("d", { etiqueta_id: null }));
    const r = await sincronizarEntregas(db);
    expect(r).toEqual({ verificados: 0, atualizados: [], erros: 0 });
    expect(h.me).not.toHaveBeenCalled();
  });

  it("respeita o lojista: se mudou o status à mão no meio, a sincronização não sobrescreve nem reenvia e-mail", async () => {
    const db = banco(pedido("a"));
    h.me.mockImplementation(async () => {
      linha(db, "a").status = "enviado"; // lojista marcou como enviado enquanto consultávamos
      return { "env-a": { status: "posted" } };
    });
    const r = await sincronizarEntregas(db);
    expect(r.atualizados).toEqual([]);
    expect(h.email).not.toHaveBeenCalled();
  });

  it("falha de e-mail não desfaz a atualização", async () => {
    const db = banco(pedido("a"));
    h.email.mockRejectedValue(new Error("resend fora do ar"));
    h.me.mockResolvedValue({ "env-a": { status: "delivered" } });
    await sincronizarEntregas(db);
    expect(linha(db, "a").status).toBe("entregue");
  });

  it("envio sem resposta do Melhor Envio fica como está", async () => {
    const db = banco(pedido("a"));
    h.me.mockResolvedValue({});
    const r = await sincronizarEntregas(db);
    expect(r.atualizados).toEqual([]);
    expect(linha(db, "a").status).toBe("preparando");
  });

  it("status que não muda mas traz o código de rastreio novo só atualiza o código, sem e-mail", async () => {
    const db = banco(pedido("a", { status: "enviado" }));
    h.me.mockResolvedValue({ "env-a": { status: "posted", tracking: "BB987654321BR" } });
    await sincronizarEntregas(db);
    expect(linha(db, "a")).toMatchObject({ status: "enviado", codigo_rastreio: "BB987654321BR" });
    expect(h.email).not.toHaveBeenCalled();
  });
});
