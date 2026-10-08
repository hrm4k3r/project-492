"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabase";
import { invalidarConfiguracoes } from "../../../lib/useConfiguracoes";

const inputClass =
  "mt-1 w-40 rounded-lg border border-cardBorder bg-white px-4 py-2.5 outline-none focus:border-gold";

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
      setMensagem({ ok: false, texto: "Confira os valores: frete grátis não pode ser negativo e o desconto vai de 0 a 100." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("configuracoes").upsert([
      { chave: "frete_gratis_acima", valor: frete, updated_at: new Date().toISOString() },
      { chave: "primeira_compra_percent", valor: percent, updated_at: new Date().toISOString() },
    ]);
    setSaving(false);

    if (error) {
      setMensagem({ ok: false, texto: "Não foi possível salvar: " + error.message });
      return;
    }
    invalidarConfiguracoes();
    setMensagem({ ok: true, texto: "Configurações salvas." });
  };

  return (
    <div>
      <h1 className="section-title">Configurações</h1>
      <p className="mt-2 max-w-xl text-primary/60">Regras comerciais da loja. As mudanças valem na hora.</p>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : (
        <form onSubmit={salvar} className="mt-8 flex max-w-xl flex-col gap-6">
          <div>
            <label className="text-sm font-medium text-primary">Frete grátis acima de (R$)</label>
            <p className="text-xs text-primary/50">Use 0 para desativar o frete grátis.</p>
            <input
              type="number" min="0" step="0.01" required
              value={freteGratis} onChange={(e) => setFreteGratis(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-primary">Desconto de primeira compra (%)</label>
            <p className="text-xs text-primary/50">
              Aplicado automaticamente ao cliente que ainda não fez nenhum pedido. Use 0 para desativar.
            </p>
            <input
              type="number" min="0" max="100" step="1" required
              value={primeiraCompra} onChange={(e) => setPrimeiraCompra(e.target.value)}
              className={inputClass}
            />
          </div>

          {mensagem && (
            <p className={`text-sm ${mensagem.ok ? "text-olive" : "text-terracotta"}`}>{mensagem.texto}</p>
          )}

          <button type="submit" disabled={saving} className="btn-primary self-start disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </form>
      )}
    </div>
  );
}
