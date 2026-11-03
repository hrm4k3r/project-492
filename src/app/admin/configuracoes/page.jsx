"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import { invalidarConfiguracoes } from "../../../lib/useConfiguracoes";
import { MOTOBOY_PADRAO } from "../../../lib/motoboy";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faLink, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

function ConexaoBling() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/bling/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ conectado: false }));
  }, []);

  const resultado = searchParams.get("bling");

  // A rota exige o token do admin, então não dá para ser um link simples.
  async function conectar() {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/bling/conectar", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Não foi possível iniciar a conexão.");
  }

  return (
    <section className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <p className="font-display text-2xl font-semibold text-primary">Bling — NF-e</p>
        {status === null ? (
          <p className="text-sm text-primary/60">Verificando conexão...</p>
        ) : status.conectado ? (
          <p className="flex items-center gap-2 text-sm text-olive">
            <FontAwesomeIcon icon={faCheck} />
            Conectado{status.conectadoEm ? ` desde ${new Date(status.conectadoEm).toLocaleDateString("pt-BR")}` : ""}.
            NF-e emitida automaticamente ao confirmar o pagamento.
          </p>
        ) : (
          <p className="text-sm text-primary/60">
            Ainda não conectado. Conecte para emissão automática de NF-e após o pagamento.
          </p>
        )}
        {resultado === "erro" && (
          <p className="mt-1 flex items-center gap-2 text-sm text-terracotta">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            Não foi possível conectar ({searchParams.get("motivo")}).
          </p>
        )}
        {resultado === "conectado" && (
          <p className="mt-1 flex items-center gap-2 text-sm text-olive">
            <FontAwesomeIcon icon={faCheck} />
            Bling conectado com sucesso!
          </p>
        )}
      </div>
      <button type="button" onClick={conectar} className="btn-outline !py-2.5 text-xs">
        <FontAwesomeIcon icon={faLink} />
        {status?.conectado ? "Reconectar" : "Conectar Bling"}
      </button>
    </section>
  );
}

export default function AdminConfiguracoes() {
  const [freteGratis, setFreteGratis] = useState("");
  const [motoboyPreco, setMotoboyPreco] = useState("");
  const [motoboyCidade, setMotoboyCidade] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("configuracoes").select("chave, valor");
      const mapa = Object.fromEntries((data ?? []).map((c) => [c.chave, c.valor]));
      setFreteGratis(String(mapa.frete_gratis_acima ?? 1000));
      setMotoboyPreco(String(mapa.motoboy_preco ?? MOTOBOY_PADRAO.preco));
      setMotoboyCidade(String(mapa.motoboy_cidade ?? MOTOBOY_PADRAO.cidade));
      setLoading(false);
    }
    carregar();
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setMensagem(null);

    const frete = Number(freteGratis);
    const motoboy = Number(motoboyPreco);
    if (!(frete >= 0) || !(motoboy >= 0)) {
      setMensagem({ ok: false, texto: "Confira os valores: frete grátis e motoboy não podem ser negativos." });
      return;
    }
    if (motoboy > 0 && !motoboyCidade.trim()) {
      setMensagem({ ok: false, texto: "Informe a cidade atendida pelo motoboy." });
      return;
    }

    setSaving(true);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("configuracoes").upsert([
      { chave: "frete_gratis_acima", valor: frete, updated_at: agora },
      { chave: "motoboy_preco", valor: motoboy, updated_at: agora },
      { chave: "motoboy_cidade", valor: motoboyCidade.trim(), updated_at: agora },
    ]);
    setSaving(false);

    if (error) {
      setMensagem({ ok: false, texto: "Não foi possível salvar: " + error.message });
      return;
    }
    invalidarConfiguracoes();
    setMensagem({ ok: true, texto: "Configurações salvas. A loja já usa os novos valores." });
  };

  return (
    <div>
      <AdminTitulo titulo="Configurações" descricao="Regras comerciais da loja. As mudanças valem na hora." />

      <div className="mt-8 max-w-2xl">
        <ConexaoBling />
      </div>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : (
        <form onSubmit={salvar} className="mt-6 flex max-w-2xl flex-col gap-6">
          <section className={cardClass}>
            <h2 className="font-display text-2xl font-semibold text-primary">Frete grátis</h2>
            <p className="mt-1 text-sm text-primary/55">
              Compras acima desse valor não pagam frete. Aparece no topo da loja e no carrinho. Use 0 para desativar.
            </p>
            <label htmlFor="frete" className={`${labelClass} mt-5 block`}>Frete grátis acima de (R$)</label>
            <input
              id="frete" type="number" min="0" step="0.01" required
              value={freteGratis} onChange={(e) => setFreteGratis(e.target.value)}
              className={`${inputClass} mt-1.5 max-w-[12rem]`}
            />
          </section>

          <section className={cardClass}>
            <h2 className="font-display text-2xl font-semibold text-primary">Entrega por motoboy</h2>
            <p className="mt-1 text-sm text-primary/55">
              Opção de entrega local com preço fixo, disponível só para endereços da cidade informada. Não entra
              no frete grátis. Use 0 para desativar.
            </p>
            <label htmlFor="motoboyCidade" className={`${labelClass} mt-5 block`}>Cidade atendida</label>
            <input
              id="motoboyCidade" type="text" placeholder="São Lourenço"
              value={motoboyCidade} onChange={(e) => setMotoboyCidade(e.target.value)}
              className={`${inputClass} mt-1.5 max-w-xs`}
            />
            <label htmlFor="motoboyPreco" className={`${labelClass} mt-4 block`}>Preço da entrega (R$)</label>
            <input
              id="motoboyPreco" type="number" min="0" step="0.01" required
              value={motoboyPreco} onChange={(e) => setMotoboyPreco(e.target.value)}
              className={`${inputClass} mt-1.5 max-w-[12rem]`}
            />
          </section>

          {mensagem && (
            <p className={`flex items-center gap-2 text-sm ${mensagem.ok ? "text-olive" : "text-terracotta"}`}>
              {mensagem.ok && <FontAwesomeIcon icon={faCheck} />}
              {mensagem.texto}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary self-start !py-3.5 disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </form>
      )}
    </div>
  );
}
