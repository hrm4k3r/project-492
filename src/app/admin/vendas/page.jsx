"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { formatBRL } from "../../../lib/loja";
import { baixarArquivo } from "../../../lib/planilha";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCashRegister, faFileExport } from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

const FORMAS = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };

const dia = (d) => d.toISOString().slice(0, 10);
const hojeLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000);

// Início/fim do dia no fuso do navegador, em ISO, para filtrar created_at.
const inicioDoDia = (s) => new Date(`${s}T00:00:00`).toISOString();
const fimDoDia = (s) => new Date(`${s}T23:59:59.999`).toISOString();

const escapar = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AdminVendas() {
  const [de, setDe] = useState(() => dia(hojeLocal()));
  const [ate, setAte] = useState(() => dia(hojeLocal()));
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("vendas_balcao")
      .select("*, vendas_balcao_itens(*)")
      .gte("created_at", inicioDoDia(de))
      .lte("created_at", fimDoDia(ate))
      .order("created_at", { ascending: false });
    if (error) setErro("Não foi possível carregar as vendas: " + error.message);
    setVendas(data ?? []);
    setLoading(false);
  }, [de, ate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const periodo = (dias) => {
    const fim = hojeLocal();
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - (dias - 1));
    setDe(dia(ini));
    setAte(dia(fim));
  };
  const esteMes = () => {
    const h = hojeLocal();
    setDe(dia(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1))));
    setAte(dia(h));
  };

  const validas = useMemo(() => vendas.filter((v) => v.status === "concluida"), [vendas]);
  const totalGeral = validas.reduce((t, v) => t + Number(v.total), 0);
  const porForma = useMemo(() => {
    const mapa = {};
    for (const v of validas) mapa[v.forma_pagamento] = (mapa[v.forma_pagamento] ?? 0) + Number(v.total);
    return mapa;
  }, [validas]);
  const maisVendidos = useMemo(() => {
    const mapa = {};
    for (const v of validas)
      for (const i of v.vendas_balcao_itens ?? []) {
        const m = (mapa[i.titulo] ??= { qtd: 0, valor: 0 });
        m.qtd += i.quantidade;
        m.valor += Number(i.subtotal);
      }
    return Object.entries(mapa).sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 5);
  }, [validas]);

  const cancelar = async (v) => {
    if (!confirm(`Cancelar esta venda de ${formatBRL(v.total)}? Os produtos voltam ao estoque.`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/pdv/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ vendaId: v.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Não foi possível cancelar a venda.");
      return;
    }
    carregar();
  };

  const exportar = () => {
    const cab = ["Data", "Hora", "Situação", "Forma de pagamento", "Cliente", "Produto", "Quantidade", "Preço unitário", "Subtotal do item", "Desconto da venda", "Total da venda"];
    const linhas = [];
    for (const v of vendas) {
      const d = new Date(v.created_at);
      for (const i of v.vendas_balcao_itens ?? []) {
        linhas.push([
          d.toLocaleDateString("pt-BR"), d.toLocaleTimeString("pt-BR"),
          v.status === "concluida" ? "Concluída" : "Cancelada",
          FORMAS[v.forma_pagamento] ?? v.forma_pagamento, v.cliente ?? "",
          i.titulo, i.quantidade, Number(i.preco_unitario).toFixed(2).replace(".", ","),
          Number(i.subtotal).toFixed(2).replace(".", ","),
          Number(v.desconto).toFixed(2).replace(".", ","), Number(v.total).toFixed(2).replace(".", ","),
        ]);
      }
    }
    const csv = `﻿${[cab, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n")}\r\n`;
    baixarArquivo(`vendas-balcao_${de}_a_${ate}.csv`, csv);
  };

  return (
    <div>
      <AdminTitulo titulo="Vendas do balcão" descricao="Vendas feitas na loja física. As vendas do site ficam em Pedidos.">
        <Link href="/admin/pdv" className="btn-primary !py-2.5 text-xs">
          <FontAwesomeIcon icon={faCashRegister} /> Nova venda
        </Link>
      </AdminTitulo>

      <section className={`${cardClass} mt-8`}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="de" className={labelClass}>De</label>
            <input id="de" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="ate" className={labelClass}>Até</label>
            <input id="ate" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => periodo(1)} className="btn-outline !py-2.5 text-xs">Hoje</button>
            <button type="button" onClick={() => periodo(7)} className="btn-outline !py-2.5 text-xs">7 dias</button>
            <button type="button" onClick={esteMes} className="btn-outline !py-2.5 text-xs">Este mês</button>
          </div>
          <button type="button" onClick={exportar} disabled={vendas.length === 0} className="btn-outline ml-auto !py-2.5 text-xs disabled:opacity-50">
            <FontAwesomeIcon icon={faFileExport} /> Exportar planilha
          </button>
        </div>
      </section>

      {erro && <p className="mt-4 text-sm text-terracotta">{erro}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className={cardClass}>
          <p className={labelClass}>Total vendido</p>
          <p className="mt-2 font-display text-4xl font-semibold text-primary">{formatBRL(totalGeral)}</p>
          <p className="mt-1 text-sm text-primary/55">{validas.length} {validas.length === 1 ? "venda" : "vendas"}</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Por forma de pagamento</p>
          <ul className="mt-2 space-y-1 text-sm text-primary">
            {Object.keys(FORMAS).map((f) => (
              <li key={f} className="flex justify-between"><span>{FORMAS[f]}</span><span>{formatBRL(porForma[f] ?? 0)}</span></li>
            ))}
          </ul>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Mais vendidos</p>
          {maisVendidos.length === 0 ? (
            <p className="mt-2 text-sm text-primary/55">Sem vendas no período.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-primary">
              {maisVendidos.map(([nome, m]) => (
                <li key={nome} className="flex justify-between gap-3"><span className="truncate">{nome}</span><span>{m.qtd} un.</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="mt-6 flex flex-col gap-3">
        {loading ? (
          <p className="text-primary/60">Carregando...</p>
        ) : vendas.length === 0 ? (
          <p className={`${cardClass} text-primary/60`}>Nenhuma venda neste período.</p>
        ) : (
          vendas.map((v) => {
            const cancelada = v.status === "cancelada";
            return (
              <article key={v.id} className={`${cardClass} ${cancelada ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary">
                      {new Date(v.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {" · "}{FORMAS[v.forma_pagamento] ?? v.forma_pagamento}
                      {v.cliente ? ` · ${v.cliente}` : ""}
                    </p>
                    {cancelada && <p className="text-xs font-medium text-terracotta">CANCELADA — estoque devolvido</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-display text-2xl font-semibold text-primary ${cancelada ? "line-through" : ""}`}>{formatBRL(v.total)}</span>
                    {!cancelada && (
                      <button type="button" onClick={() => cancelar(v)} className="text-xs text-terracotta underline">Cancelar venda</button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-0.5 text-sm text-primary/70">
                  {(v.vendas_balcao_itens ?? []).map((i) => (
                    <li key={i.id}>{i.quantidade}x {i.titulo} — {formatBRL(i.subtotal)}</li>
                  ))}
                  {Number(v.desconto) > 0 && <li>Desconto: -{formatBRL(v.desconto)}</li>}
                </ul>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
