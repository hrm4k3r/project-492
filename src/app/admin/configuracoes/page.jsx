"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import { invalidarConfiguracoes } from "../../../lib/useConfiguracoes";
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
      <a href="/api/bling/conectar" className="btn-outline !py-2.5 text-xs">
        <FontAwesomeIcon icon={faLink} />
        {status?.conectado ? "Reconectar" : "Conectar Bling"}
      </a>
    </section>
  );
}

export default function AdminConfiguracoes() {
  const [freteGratis, setFreteGratis] = useState("");
  const [primeiraCompra, setPrimeiraCompra] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("configuracoes").select("chave, valor");
      const mapa = Object.fromEntries((data ?? []).map((c) => [c.chave, c.valor]));
      setFreteGratis(String(mapa.frete_gratis_acima ?? 1000));
      setPrimeiraCompra(String(mapa.primeira_compra_percent ?? 10));
      setLoading(false);
    }
    carregar();
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setMensagem(null);

    const frete = Number(freteGratis);
    const percent = Number(primeiraCompra);
    if (!(frete >= 0) || !(percent >= 0 && percent <= 100)) {
      setMensagem({ ok: false, texto: "Confira os valores: o frete grátis não pode ser negativo e o desconto vai de 0 a 100." });
      return;
    }

    setSaving(true);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("configuracoes").upsert([
      { chave: "frete_gratis_acima", valor: frete, updated_at: agora },
      { chave: "primeira_compra_percent", valor: percent, updated_at: agora },
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
            <h2 className="font-display text-2xl font-semibold text-primary">Desconto de primeira compra</h2>
            <p className="mt-1 text-sm text-primary/55">
              Aplicado automaticamente ao cliente que ainda não fez nenhum pedido, sem precisar de cupom. Se o
              cliente usar um cupom melhor, vale o maior desconto. Use 0 para desativar.
            </p>
            <label htmlFor="primeira" className={`${labelClass} mt-5 block`}>Desconto (%)</label>
            <input
              id="primeira" type="number" min="0" max="100" step="1" required
              value={primeiraCompra} onChange={(e) => setPrimeiraCompra(e.target.value)}
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
