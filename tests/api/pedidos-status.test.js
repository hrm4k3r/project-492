import { describe, it, expect, beforeEach, vi } from "vitest";
import { criarBanco, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, emails: [], statusEmails: [], avisosLoja: [], nfes: [] }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/email", () => ({
  enviarEmailConfirmacaoPedido: async (id) => { h.emails.push(id); },
  enviarEmailAtualizacaoStatus: async (id, status) => { h.statusEmails.push([id, status]); },
  enviarEmailNovoPedidoParaLoja: async (id) => { h.avisosLoja.push(id); },
}));
vi.mock("../../src/lib/bling", () => ({ emitirNFe: async (id) => { h.nfes.push(id); } }));
vi.mock("../../src/lib/telegram", () => ({ enviarTelegramNovoPedido: async () => {} }));

import { PATCH } from "../../src/app/api/pedidos/[id]/status/route";

const chamar = async (id, status, token = "tok-admin") =>
  resposta(
    await PATCH(
      new Request(`https://loja.test/api/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status }),
      }),
      { params: { id } }
    )
  );

beforeEach(() => {
  h.emails = [];
  h.statusEmails = [];
  h.avisosLoja = [];
  h.nfes = [];
  h.db = criarBanco({
    tokens: { "tok-admin": { id: "adm" }, "tok-cli": { id: "u1" } },
    tabelas: {
      profiles: [{ id: "adm", role: "admin" }, { id: "u1", role: "customer" }],
      orders: [
        { id: "o-pendente", status: "pendente" },
        { id: "o-enviado", status: "enviado" },
      ],
    },
  });
});

describe("PATCH /api/pedidos/[id]/status", () => {
  it("só o admin altera o status", async () => {
    expect((await chamar("o-pendente", "pago", null)).status).toBe(401);
    expect((await chamar("o-pendente", "pago", "tok-cli")).status).toBe(401);
    expect(h.db.tabelas.orders[0].status).toBe("pendente");
  });

  it("confirmar pagamento manual envia e-mail e emite a NF-e", async () => {
    expect((await chamar("o-pendente", "pago")).status).toBe(200);
    expect(h.db.tabelas.orders[0]).toMatchObject({ status: "pago", payment_status: "pago" });
    expect(h.emails).toEqual(["o-pendente"]);
    expect(h.avisosLoja).toEqual(["o-pendente"]);
    expect(h.nfes).toEqual(["o-pendente"]);
  });

  it("grava o código de rastreio só ao marcar como enviado", async () => {
    const enviar = (id, status, codigoRastreio) =>
      PATCH(
        new Request(`https://loja.test/api/pedidos/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: "Bearer tok-admin" },
          body: JSON.stringify({ status, codigoRastreio }),
        }),
        { params: { id } }
      );

    await enviar("o-pendente", "enviado", "  BR123456789BR  ");
    expect(h.db.tabelas.orders[0]).toMatchObject({ status: "enviado", codigo_rastreio: "BR123456789BR" });

    await enviar("o-enviado", "entregue", "BR999");
    expect(h.db.tabelas.orders[1].codigo_rastreio).toBeUndefined();

    expect(h.statusEmails).toContainEqual(["o-pendente", "enviado"]);
  });

  it("repetir a confirmação não emite a NF-e de novo", async () => {
    await chamar("o-pendente", "pago");
    await chamar("o-pendente", "pago");
    expect(h.nfes).toHaveLength(1);
    expect(h.emails).toHaveLength(1);
  });

  it("voltar um pedido já andamento para 'pago' não reemite NF-e nem e-mail de confirmação", async () => {
    expect((await chamar("o-enviado", "pago")).status).toBe(200);
    expect(h.nfes).toHaveLength(0);
    expect(h.emails).toHaveLength(0);
  });

  it("outras mudanças de status avisam o cliente", async () => {
    await chamar("o-enviado", "entregue");
    expect(h.statusEmails).toEqual([["o-enviado", "entregue"]]);
    expect(h.nfes).toHaveLength(0);
  });

  it("recusa status inválido e pedido inexistente", async () => {
    expect((await chamar("o-pendente", "qualquer")).status).toBe(400);
    expect((await chamar("nao-existe", "pago")).status).toBe(404);
  });
});
