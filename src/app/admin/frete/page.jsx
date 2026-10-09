"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrashCan, faFloppyDisk, faLink, faCheck, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

const regraVazia = { regiao: "", estados: "", preco: "", prazo_dias: "", ordem: "" };

function ConexaoMelhorEnvio() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/melhorenvio/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ conectado: false }));
  }, []);

  const resultado = searchParams.get("melhorenvio");

  return (
    <div className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <p className="font-display text-2xl font-semibold text-primary">Melhor Envio</p>
        {status === null ? (
          <p className="text-sm text-primary/60">Verificando conexão...</p>
        ) : status.conectado ? (
          <p className="flex items-center gap-2 text-sm text-olive">
            <FontAwesomeIcon icon={faCheck} />
            Conectado{status.conectadoEm ? ` desde ${new Date(status.conectadoEm).toLocaleDateString("pt-BR")}` : ""}.
            O frete é calculado automaticamente.
          </p>
        ) : (
          <p className="text-sm text-primary/60">
            Ainda não conectado. Enquanto isso, o carrinho usa a tabela de regiões abaixo.
          </p>
        )}
        {resultado === "erro" && (
          <p className="mt-1 flex items-center gap-2 text-sm text-terracotta">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            Não foi possível conectar ({searchParams.get("motivo")}).
          </p>
        )}
      </div>
      <a href="/api/melhorenvio/conectar" className="btn-outline !py-2.5 text-xs">
        <FontAwesomeIcon icon={faLink} />
        {status?.conectado ? "Reconectar" : "Conectar Melhor Envio"}
      </a>
    </div>
  );
}

export default function AdminFrete() {
  const [regras, setRegras] = useState([]);
  const [nova, setNova] = useState(regraVazia);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    const { data } = await supabase.from("freight_rules").select("*").order("ordem", { ascending: true });
    setRegras(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const editar = (id, campo, valor) => {
    setRegras((rs) => rs.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const salvar = async (regra) => {
    const { error } = await supabase
      .from("freight_rules")
      .update({
        regiao: regra.regiao,
        preco: Number(regra.preco),
        prazo_dias: Number(regra.prazo_dias),
        ordem: Number(regra.ordem),
        ativo: regra.ativo,
      })
      .eq("id", regra.id);
    if (error) {
      alert("Não foi possível salvar a regra: " + error.message);
      return;
    }
    carregar();
  };

  const remover = async (id) => {
    if (!confirm("Remover essa regra de frete?")) return;
    const { error } = await supabase.from("freight_rules").delete().eq("id", id);
    if (error) {
      alert("Não foi possível remover a regra: " + error.message);
      return;
    }
    carregar();
  };

  const adicionar = async (e) => {
    e.preventDefault();
    const estados = nova.estados.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const { error } = await supabase.from("freight_rules").insert({
      regiao: nova.regiao,
      estados,
      preco: Number(nova.preco),
      prazo_dias: Number(nova.prazo_dias) || 7,
      ordem: Number(nova.ordem) || 99,
    });
    if (error) {
      alert("Não foi possível adicionar a regra: " + error.message);
      return;
    }
    setNova(regraVazia);
    carregar();
  };

  return (
    <div>
      <AdminTitulo
        titulo="Frete"
        descricao="Conexão com o Melhor Envio e a tabela de regiões usada como reserva."
      />

      <div className="mt-8">
        <ConexaoMelhorEnvio />
      </div>

      <h2 className="mt-10 font-display text-3xl font-semibold text-primary">Tabela por região</h2>
      <p className="mt-2 max-w-2xl text-sm text-primary/60">
        Usada quando o cálculo automático não está disponível. A regra com menor &quot;ordem&quot; é testada
        primeiro; deixe os estados em branco na última regra para servir de padrão (&quot;demais estados&quot;).
      </p>

      {loading ? (
        <p className="mt-6 text-primary/60">Carregando...</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {regras.map((regra) => (
            <div key={regra.id} className={`${cardClass} grid items-end gap-4 !py-4 md:grid-cols-[1.6fr_auto_6rem_5.5rem_4.5rem_auto]`}>
              <div>
                <label className={labelClass}>Região</label>
                <input
                  value={regra.regiao} onChange={(e) => editar(regra.id, "regiao", e.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <p className="pb-3 text-xs text-primary/50">UF: {regra.estados?.join(", ") || "todas"}</p>
              <div>
                <label className={labelClass}>Preço</label>
                <input
                  type="number" step="0.01" value={regra.preco}
                  onChange={(e) => editar(regra.id, "preco", e.target.value)} className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={labelClass}>Prazo (dias)</label>
                <input
                  type="number" value={regra.prazo_dias}
                  onChange={(e) => editar(regra.id, "prazo_dias", e.target.value)} className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={labelClass}>Ordem</label>
                <input
                  type="number" value={regra.ordem}
                  onChange={(e) => editar(regra.id, "ordem", e.target.value)} className={`${inputClass} mt-1.5`}
                />
              </div>
              <div className="flex items-center gap-4 pb-2.5">
                <label className="flex items-center gap-1.5 text-xs text-primary/70">
                  <input
                    type="checkbox" checked={regra.ativo} onChange={(e) => editar(regra.id, "ativo", e.target.checked)}
                    className="accent-[#5A2A14]"
                  />
                  Ativa
                </label>
                <button onClick={() => salvar(regra)} aria-label="Salvar regra" className="text-olive transition-colors hover:text-terracotta">
                  <FontAwesomeIcon icon={faFloppyDisk} />
                </button>
                <button onClick={() => remover(regra.id)} aria-label="Remover regra" className="text-primary/45 transition-colors hover:text-terracotta">
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={adicionar} className={`${cardClass} mt-6 grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_7rem_6rem_5rem_auto]`}>
        <div>
          <label htmlFor="regiao" className={labelClass}>Nova região</label>
          <input
            id="regiao" required value={nova.regiao} onChange={(e) => setNova({ ...nova, regiao: e.target.value })}
            className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="estados" className={labelClass}>UF (vírgula)</label>
          <input
            id="estados" value={nova.estados} onChange={(e) => setNova({ ...nova, estados: e.target.value })}
            placeholder="MG, SP" className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="preco" className={labelClass}>Preço (R$)</label>
          <input
            id="preco" required type="number" step="0.01" min="0" value={nova.preco}
            onChange={(e) => setNova({ ...nova, preco: e.target.value })} className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="prazo" className={labelClass}>Prazo (dias)</label>
          <input
            id="prazo" type="number" min="1" value={nova.prazo_dias}
            onChange={(e) => setNova({ ...nova, prazo_dias: e.target.value })} className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="ordem" className={labelClass}>Ordem</label>
          <input
            id="ordem" type="number" value={nova.ordem}
            onChange={(e) => setNova({ ...nova, ordem: e.target.value })} className={`${inputClass} mt-1.5`}
          />
        </div>
        <button type="submit" className="btn-primary !py-3 text-xs">
          <FontAwesomeIcon icon={faPlus} />
          Adicionar
        </button>
      </form>
    </div>
  );
}
