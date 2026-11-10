"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { formatBRL } from "../../../lib/loja";
import { baixarArquivo } from "../../../lib/planilha";
import { consolidar, diaLocal, nomeDaForma, vendasParaCSV } from "../../../lib/relatorio";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport } from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

const inicioDoDia = (s) => new Date(`${s}T00:00:00`).toISOString();
const fimDoDia = (s) => new Date(`${s}T23:59:59.999`).toISOString();

// O Supabase devolve no máximo 1000 linhas por consulta; busca em páginas até acabar.
async function buscarTudo(montar) {
  const POR_PAGINA = 1000;
  const todas = [];
  for (let pagina = 0; pagina < 20; pagina++) {
    const { data, error } = await montar().range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1);
    if (error) throw error;
    todas.push(...(data ?? []));
    if ((data ?? []).length < POR_PAGINA) break;
  }
  return todas;
}

function Cartao({ rotulo, valor, detalhe }) {
  return (
    <div className={cardClass}>
      <p className={labelClass}>{rotulo}</p>
      <p className="mt-2 font-display text-3xl font-semibold leading-none text-primary md:text-4xl">{valor}</p>
      {detalhe && <p className="mt-2 text-sm text-primary/55">{detalhe}</p>}
    </div>
  );
}

export default function AdminRelatorio() {
  const hoje = diaLocal(new Date());
  const [de, setDe] = useState(() => diaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [ate, setAte] = useState(hoje);
  const [pedidos, setPedidos] = useState([]);
  const [balcao, setBalcao] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [p, b] = await Promise.all([
        buscarTudo(() =>
          supabase
            .from("orders")
            .select("id, status, subtotal, desconto, desconto_pix, frete, total, created_at, profiles(full_name), order_items(titulo, quantidade, subtotal)")
            .gte("created_at", inicioDoDia(de))
            .lte("created_at", fimDoDia(ate))
            .order("created_at", { ascending: false })
        ),
        buscarTudo(() =>
          supabase
            .from("vendas_balcao")
            .select("*, vendas_balcao_itens(titulo, quantidade, subtotal)")
            .gte("created_at", inicioDoDia(de))
            .lte("created_at", fimDoDia(ate))
            .order("created_at", { ascending: false })
        ),
      ]);
      setPedidos(p);
      setBalcao(b);
    } catch (e) {
      setErro("Não foi possível carregar o relatório: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }, [de, ate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const r = useMemo(() => consolidar({ pedidos, vendasBalcao: balcao, de, ate }), [pedidos, balcao, de, ate]);

  const periodo = (dias) => {
    const fim = new Date();
    const ini = new Date();
    ini.setDate(ini.getDate() - (dias - 1));
    setDe(diaLocal(ini));
    setAte(diaLocal(fim));
  };
  const esteMes = () => {
    const h = new Date();
    setDe(diaLocal(new Date(h.getFullYear(), h.getMonth(), 1)));
    setAte(diaLocal(h));
  };
  const mesPassado = () => {
    const h = new Date();
    setDe(diaLocal(new Date(h.getFullYear(), h.getMonth() - 1, 1)));
    setAte(diaLocal(new Date(h.getFullYear(), h.getMonth(), 0)));
  };

  const pct = (parte) => (r.faturamento > 0 ? Math.round((parte / r.faturamento) * 100) : 0);
  const maiorDia = Math.max(1, ...r.porDia.map((d) => d.site + d.loja));
  const mostrarRotulos = r.porDia.length <= 31;

  const exportar = () => baixarArquivo(`relatorio-vendas_${de}_a_${ate}.csv`, vendasParaCSV(r.vendas));

  return (
    <div>
      <AdminTitulo titulo="Relatório de vendas" descricao="Site e loja física juntos. Só conta venda paga: pedido aguardando pagamento ou cancelado fica de fora." />

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
            <button type="button" onClick={() => periodo(30)} className="btn-outline !py-2.5 text-xs">30 dias</button>
            <button type="button" onClick={esteMes} className="btn-outline !py-2.5 text-xs">Este mês</button>
            <button type="button" onClick={mesPassado} className="btn-outline !py-2.5 text-xs">Mês passado</button>
          </div>
          <button type="button" onClick={exportar} disabled={r.vendas.length === 0} className="btn-outline ml-auto !py-2.5 text-xs disabled:opacity-50">
            <FontAwesomeIcon icon={faFileExport} /> Exportar planilha
          </button>
        </div>
      </section>

      {erro && <p className="mt-4 text-sm text-terracotta">{erro}</p>}
      {loading && <p className="mt-6 text-primary/60">Carregando...</p>}

      {!loading && !erro && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao rotulo="Faturamento" valor={formatBRL(r.faturamento)} detalhe="Total recebido, com frete e já descontados os cupons" />
            <Cartao rotulo="Vendas" valor={r.qtd} detalhe={`${r.porCanal.site.qtd} no site · ${r.porCanal.loja.qtd} na loja`} />
            <Cartao rotulo="Ticket médio" valor={formatBRL(r.ticketMedio)} detalhe="Faturamento ÷ número de vendas" />
            <Cartao rotulo="Descontos dados" valor={formatBRL(r.descontos)} detalhe={`Frete cobrado no site: ${formatBRL(r.fretes)}`} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className={cardClass}>
              <p className={labelClass}>Por canal</p>
              <ul className="mt-3 space-y-4">
                {[
                  { chave: "site", nome: "Site" },
                  { chave: "loja", nome: "Loja física" },
                ].map(({ chave, nome }) => (
                  <li key={chave}>
                    <div className="flex items-baseline justify-between text-sm text-primary">
                      <span className="font-medium">{nome}</span>
                      <span>
                        {formatBRL(r.porCanal[chave].valor)}{" "}
                        <span className="text-primary/50">({pct(r.porCanal[chave].valor)}%)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cardBorder">
                      <div
                        className={`h-full rounded-full ${chave === "site" ? "bg-brand" : "bg-gold"}`}
                        style={{ width: `${pct(r.porCanal[chave].valor)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={cardClass}>
              <p className={labelClass}>Loja física por forma de pagamento</p>
              <ul className="mt-3 space-y-1.5 text-sm text-primary">
                {["dinheiro", "pix", "debito", "credito"].map((f) => (
                  <li key={f} className="flex justify-between">
                    <span>{nomeDaForma(f)}</span>
                    <span>{formatBRL(r.porFormaLoja[f] ?? 0)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-primary/50">Vendas do site são pagas por Pix ou cartão no Mercado Pago.</p>
            </section>
          </div>

          <section className={`${cardClass} mt-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={labelClass}>Faturamento por dia</p>
              <p className="flex items-center gap-3 text-xs text-primary/60">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" /> Site</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-gold" /> Loja</span>
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="flex h-40 items-end gap-1" style={{ minWidth: `${Math.max(r.porDia.length * 18, 0)}px` }}>
                {r.porDia.map((d) => {
                  const total = d.site + d.loja;
                  const alt = (total / maiorDia) * 100;
                  return (
                    <div
                      key={d.dia}
                      className="flex h-full flex-1 flex-col justify-end"
                      title={`${new Date(`${d.dia}T12:00:00`).toLocaleDateString("pt-BR")}: ${formatBRL(total)} (site ${formatBRL(d.site)} · loja ${formatBRL(d.loja)})`}
                    >
                      <div className="flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: `${alt}%` }}>
                        <div className="w-full bg-gold" style={{ height: total ? `${(d.loja / total) * 100}%` : 0 }} />
                        <div className="w-full bg-brand" style={{ height: total ? `${(d.site / total) * 100}%` : 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {mostrarRotulos && r.porDia.length > 0 && (
                <div className="mt-1 flex gap-1" style={{ minWidth: `${r.porDia.length * 18}px` }}>
                  {r.porDia.map((d) => (
                    <span key={d.dia} className="flex-1 text-center text-[9px] text-primary/45">{d.dia.slice(8)}</span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={`${cardClass} mt-4`}>
            <p className={labelClass}>Produtos mais vendidos</p>
            {r.produtos.length === 0 ? (
              <p className="mt-3 text-sm text-primary/55">Sem vendas no período.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cardBorder text-[11px] uppercase tracking-[0.14em] text-primary/50">
                      <th className="py-2 pr-3 font-medium">Produto</th>
                      <th className="py-2 pr-3 text-right font-medium">Qtd.</th>
                      <th className="py-2 pr-3 text-right font-medium">Site</th>
                      <th className="py-2 pr-3 text-right font-medium">Loja</th>
                      <th className="py-2 text-right font-medium">Valor*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.produtos.slice(0, 15).map((p) => (
                      <tr key={p.titulo} className="border-b border-cardBorder/60 text-primary">
                        <td className="py-2 pr-3">{p.titulo}</td>
                        <td className="py-2 pr-3 text-right font-medium">{p.qtd}</td>
                        <td className="py-2 pr-3 text-right text-primary/60">{p.site}</td>
                        <td className="py-2 pr-3 text-right text-primary/60">{p.loja}</td>
                        <td className="py-2 text-right">{formatBRL(p.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-primary/50">*Valor dos produtos antes de descontos e frete.</p>
              </div>
            )}
          </section>

          <p className="mt-4 text-xs text-primary/55">
            Fora do faturamento neste período: {r.aguardando} {r.aguardando === 1 ? "pedido aguardando pagamento" : "pedidos aguardando pagamento"} e{" "}
            {r.cancelados} {r.cancelados === 1 ? "cancelado" : "cancelados"}. Detalhes em{" "}
            <Link href="/admin/pedidos" className="underline">Pedidos</Link> e{" "}
            <Link href="/admin/vendas" className="underline">Vendas do balcão</Link>.
          </p>
        </>
      )}
    </div>
  );
}
