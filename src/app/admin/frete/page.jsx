"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrashCan, faFloppyDisk, faLink, faCheck, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { formatBRL } from "../../../lib/loja";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

const regraVazia = { regiao: "", estados: "", preco: "", prazo_dias: "", ordem: "" };

function ConexaoMelhorEnvio() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) =>
        fetch("/api/melhorenvio/status", {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        })
      )
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ conectado: false }));
  }, []);

  const resultado = searchParams.get("melhorenvio");

  // A rota exige o token do admin, então não dá para ser um link simples.
  async function conectar() {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/melhorenvio/conectar", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Não foi possível iniciar a conexão.");
  }

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
      <button type="button" onClick={conectar} className="btn-outline !py-2.5 text-xs">
        <FontAwesomeIcon icon={faLink} />
        {status?.conectado ? "Reconectar" : "Conectar Melhor Envio"}
      </button>
    </div>
  );
}

// Simula a cotação no Melhor Envio mostrando TODOS os serviços, inclusive os indisponíveis e o motivo.
function SimuladorFrete() {
  const [produtos, setProdutos] = useState([]);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [cep, setCep] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    supabase.from("produtos").select("id, produto").order("produto").then(({ data }) => {
      setProdutos(data ?? []);
      if (data?.[0]) setProdutoId(data[0].id);
    });
  }, []);

  const simular = async () => {
    setErro("");
    setResultado(null);
    setCarregando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/melhorenvio/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ cep, itens: [{ id: produtoId, quantidade: Number(quantidade) || 1 }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErro(data.error ?? "Não foi possível simular.");
      else setResultado(data);
    } catch {
      setErro("Sem conexão.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <section className={`${cardClass} mt-6`}>
      <h2 className="font-display text-2xl font-semibold text-primary">Simular frete</h2>
      <p className="mt-1 max-w-2xl text-sm text-primary/60">
        Mostra o que o Melhor Envio responde para um CEP, serviço por serviço, inclusive os que não aparecem no
        carrinho e o motivo. Não compra nada.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="sim-produto" className={labelClass}>Produto</label>
          <select id="sim-produto" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className={`${inputClass} mt-1.5`}>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.produto}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sim-qtd" className={labelClass}>Quantidade</label>
          <input id="sim-qtd" type="number" min="1" max="99" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="sim-cep" className={labelClass}>CEP de destino</label>
          <input id="sim-cep" inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} className={`${inputClass} mt-1.5`} />
        </div>
        <button type="button" onClick={simular} disabled={carregando || !produtoId} className="btn-primary !py-3 text-xs disabled:opacity-60">
          {carregando ? "Simulando..." : "Simular"}
        </button>
      </div>

      {erro && <p className="mt-4 text-sm text-terracotta">{erro}</p>}

      {resultado && (
        <div className="mt-5 text-sm text-primary">
          <p className="text-xs text-primary/55">
            Origem: CEP {resultado.origem ?? "não configurado"} · Enviado ao Melhor Envio:{" "}
            {resultado.enviado.map((e, i) => (
              <span key={i}>{e.quantidade}x {e.pesoKg} kg, {e.altura}x{e.largura}x{e.comprimento} cm, seguro {formatBRL(e.seguro)}</span>
            ))}
          </p>
          {resultado.servicos.length === 0 ? (
            <p className="mt-3 text-terracotta">O Melhor Envio não devolveu nenhum serviço para esse CEP.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead>
                  <tr className="border-b border-cardBorder text-[11px] uppercase tracking-[0.14em] text-primary/50">
                    <th className="py-2 pr-3 font-medium">Transportadora</th>
                    <th className="py-2 pr-3 font-medium">Serviço</th>
                    <th className="py-2 pr-3 text-right font-medium">Preço</th>
                    <th className="py-2 pr-3 text-right font-medium">Prazo</th>
                    <th className="py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.servicos.map((sv, i) => (
                    <tr key={i} className="border-b border-cardBorder/60">
                      <td className="py-2 pr-3">{sv.empresa}</td>
                      <td className="py-2 pr-3">{sv.servico}</td>
                      <td className="py-2 pr-3 text-right">{sv.preco != null ? formatBRL(sv.preco) : "—"}</td>
                      <td className="py-2 pr-3 text-right">{sv.prazoDias != null ? `${sv.prazoDias} d` : "—"}</td>
                      <td className={`py-2 ${sv.erro ? "text-terracotta" : "text-olive"}`}>{sv.erro ?? "Disponível"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
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

      <SimuladorFrete />

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
