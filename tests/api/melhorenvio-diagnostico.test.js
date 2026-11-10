import { describe, it, expect, vi } from "vitest";
import { criarBanco, requisicao, resposta } from "../helpers/fakeSupabase";

const h = vi.hoisted(() => ({ db: null, calcular: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => h.db }));
vi.mock("../../src/lib/melhorenvio", () => ({ calcularFrete: (...a) => h.calcular(...a) }));

import { POST } from "../../src/app/api/melhorenvio/diagnostico/route";

h.db = criarBanco({
  tokens: { "tok-a": { id: "a1" }, "tok-c": { id: "c1" } },
  tabelas: {
    profiles: [{ id: "a1", role: "admin" }, { id: "c1", role: "customer" }],
    produtos: [{ id: "p1", valor: 50, peso_kg: 1, altura_cm: 25, largura_cm: 16, comprimento_cm: 23 }],
  },
});

const chamar = async (token, body) => resposta(await POST(requisicao("http://x/api/melhorenvio/diagnostico", { token, body })));

describe("POST /api/melhorenvio/diagnostico", () => {
  it("só admin", async () => {
    expect((await chamar("tok-c", { cep: "01310100", itens: [{ id: "p1", quantidade: 1 }] })).status).toBe(401);
    expect((await chamar(undefined, {})).status).toBe(401);
  });

  it("valida CEP e itens", async () => {
    expect((await chamar("tok-a", { cep: "123", itens: [{ id: "p1", quantidade: 1 }] })).status).toBe(400);
    expect((await chamar("tok-a", { cep: "01310100", itens: [] })).status).toBe(400);
  });

  it("mostra os serviços disponíveis e os indisponíveis com o motivo, e o que foi enviado", async () => {
    h.calcular.mockResolvedValue([
      { name: ".Package", company: { name: "Jadlog" }, price: "19.47", custom_price: "25.00", delivery_time: 4 },
      { name: "PAC", company: { name: "Correios" }, error: "Serviço indisponível para as dimensões informadas." },
    ]);
    const r = await chamar("tok-a", { cep: "01310-100", itens: [{ id: "p1", quantidade: 2 }] });
    expect(r.status).toBe(200);
    expect(r.json.servicos).toEqual([
      { empresa: "Jadlog", servico: ".Package", preco: 19.47, precoCheio: 25, prazoDias: 4, erro: null },
      { empresa: "Correios", servico: "PAC", preco: null, precoCheio: null, prazoDias: null, erro: "Serviço indisponível para as dimensões informadas." },
    ]);
    // 2 unidades com as medidas da caixa padrão = 1 caixa (0,3 kg vazia + 2 x 1 kg), seguro das duas
    expect(r.json.enviado).toHaveLength(1);
    expect(r.json.enviado[0]).toMatchObject({ largura: 16, altura: 25, comprimento: 23, pesoKg: 2.3, quantidade: 1, seguro: 100 });
    expect(h.calcular).toHaveBeenCalledWith(expect.objectContaining({ cepDestino: "01310100" }));
  });
});
