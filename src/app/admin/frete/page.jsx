"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faFloppyDisk, faLink, faCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

const emptyRule = { regiao: "", estados: "", preco: "", prazo_dias: "", ordem: 0, ativo: true };

function ConexaoMelhorEnvio() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/melhorenvio/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ conectado: false }));
  }, []);

  const resultadoRedirect = searchParams.get("melhorenvio");

  return (
    <div className="card-surface mb-8 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="font-display text-lg text-primary">Melhor Envio</p>
        {status === null ? (
          <p className="text-sm text-primary/60">Verificando conexão...</p>
        ) : status.conectado ? (
          <p className="flex items-center gap-2 text-sm text-olive">
            <FontAwesomeIcon icon={faCheck} />
            Conectado {status.conectadoEm ? `desde ${new Date(status.conectadoEm).toLocaleDateString("pt-BR")}` : ""}
          </p>
        ) : (
          <p className="text-sm text-primary/60">Ainda não conectado — o cálculo automático de frete não está ativo.</p>
        )}
        {resultadoRedirect === "erro" && (
          <p className="mt-1 flex items-center gap-2 text-sm text-terracotta">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            Não foi possível conectar ({searchParams.get("motivo")}).
          </p>
        )}
      </div>
      <a href="/api/melhorenvio/conectar" className="btn-outline text-sm">
        <FontAwesomeIcon icon={faLink} />
        {status?.conectado ? "Reconectar" : "Conectar Melhor Envio"}
      </a>
    </div>
  );
}

export default function AdminFrete() {
  const [rules, setRules] = useState([]);
  const [novo, setNovo] = useState(emptyRule);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    const { data } = await supabase.from("freight_rules").select("*").order("ordem", { ascending: true });
    setRules(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const updateRule = (id, field, value) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRule = async (rule) => {
    await supabase.from("freight_rules").update({
      regiao: rule.regiao,
      preco: Number(rule.preco),
      prazo_dias: Number(rule.prazo_dias),
      ordem: Number(rule.ordem),
      ativo: rule.ativo,
    }).eq("id", rule.id);
    loadRules();
  };

  const deleteRule = async (id) => {
    if (!confirm("Remover essa regra de frete?")) return;
    await supabase.from("freight_rules").delete().eq("id", id);
    loadRules();
  };

  const addRule = async (e) => {
    e.preventDefault();
    const estados = novo.estados.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    await supabase.from("freight_rules").insert({
      regiao: novo.regiao,
      estados,
      preco: Number(novo.preco),
      prazo_dias: Number(novo.prazo_dias) || 7,
      ordem: Number(novo.ordem) || 99,
    });
    setNovo(emptyRule);
    loadRules();
  };

  return (
    <div>
      <h1 className="section-title">Frete</h1>
      <p className="mt-2 max-w-xl text-primary/60">
        Tabela fixa por região, usada até integrarmos o cálculo automático
        (Melhor Envio). A regra com menor &quot;ordem&quot; é testada primeiro;
        deixe os estados em branco na última regra para servir de padrão
        (&quot;demais estados&quot;).
      </p>

      <div className="mt-6">
        <ConexaoMelhorEnvio />
      </div>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {rules.map((rule) => (
            <div key={rule.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
              <input
                value={rule.regiao}
                onChange={(e) => updateRule(rule.id, "regiao", e.target.value)}
                className="min-w-[180px] flex-1 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold"
              />
              <span className="text-xs text-primary/50">UF: {rule.estados?.join(", ") || "todos"}</span>
              <input
                type="number" step="0.01"
                value={rule.preco}
                onChange={(e) => updateRule(rule.id, "preco", e.target.value)}
                className="w-24 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold"
              />
              <input
                type="number"
                value={rule.prazo_dias}
                onChange={(e) => updateRule(rule.id, "prazo_dias", e.target.value)}
                className="w-20 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold"
                title="Prazo em dias"
              />
              <label className="flex items-center gap-1.5 text-xs text-primary/70">
                <input type="checkbox" checked={rule.ativo} onChange={(e) => updateRule(rule.id, "ativo", e.target.checked)} />
                Ativo
              </label>
              <button onClick={() => saveRule(rule)} className="text-olive hover:text-terracotta">
                <FontAwesomeIcon icon={faFloppyDisk} />
              </button>
              <button onClick={() => deleteRule(rule.id)} className="text-primary/50 hover:text-terracotta">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addRule} className="card-surface mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-primary/60">Região</label>
          <input required value={novo.regiao} onChange={(e) => setNovo({ ...novo, regiao: e.target.value })} className="mt-1 w-full rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
        <div>
          <label className="text-xs text-primary/60">UF (separadas por vírgula)</label>
          <input value={novo.estados} onChange={(e) => setNovo({ ...novo, estados: e.target.value })} placeholder="MG, SP" className="mt-1 w-32 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
        <div>
          <label className="text-xs text-primary/60">Preço (R$)</label>
          <input required type="number" step="0.01" value={novo.preco} onChange={(e) => setNovo({ ...novo, preco: e.target.value })} className="mt-1 w-24 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
        <div>
          <label className="text-xs text-primary/60">Prazo (dias)</label>
          <input type="number" value={novo.prazo_dias} onChange={(e) => setNovo({ ...novo, prazo_dias: e.target.value })} className="mt-1 w-20 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
        <button type="submit" className="btn-outline text-sm">
          <FontAwesomeIcon icon={faPlus} />
          Adicionar regra
        </button>
      </form>
    </div>
  );
}
