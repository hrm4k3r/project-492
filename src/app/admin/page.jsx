"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../config/supabase";
import { formatBRL } from "../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock, faCoins, faBoxOpen, faWineBottle, faPlus, faGear, faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "./components/AdminTitulo";
import { cardClass, statusInfo } from "./ui";

const CONFIRMADOS = ["pago", "preparando", "enviado", "entregue"];

function Indicador({ icon, label, valor, detalhe, href, destaque }) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-4 rounded-2xl border p-5 shadow-soft transition-shadow hover:shadow-card ${
        destaque ? "border-gold bg-gold/15" : "border-cardBorder bg-white"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-lg text-gold">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary/55">{label}</p>
        <p className="mt-1 font-display text-3xl font-semibold leading-none text-primary">{valor}</p>
        {detalhe && <p className="mt-1.5 text-xs text-primary/55">{detalhe}</p>}
      </div>
    </Link>
  );
}

export default function AdminPainel() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    async function carregar() {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [produtos, pedidos, recentes] = await Promise.all([
        supabase.from("produtos").select("id, ativo"),
        supabase.from("orders").select("status, total, created_at"),
        supabase
          .from("orders")
          .select("id, status, total, created_at, frete_servico, profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const lista = pedidos.data ?? [];
      const pendentes = lista.filter((p) => p.status === "pendente");
      const doMes = lista.filter((p) => new Date(p.created_at) >= inicioMes);
      const vendasMes = doMes
        .filter((p) => CONFIRMADOS.includes(p.status))
        .reduce((soma, p) => soma + Number(p.total), 0);

      setDados({
        produtosAtivos: (produtos.data ?? []).filter((p) => p.ativo).length,
        produtosTotal: produtos.data?.length ?? 0,
        pendentes: pendentes.length,
        aReceber: pendentes.reduce((soma, p) => soma + Number(p.total), 0),
        pedidosMes: doMes.length,
        vendasMes,
        recentes: recentes.data ?? [],
      });
    }
    carregar();
  }, []);

  const carregando = dados === null;

  return (
    <div>
      <AdminTitulo titulo="Painel" descricao="Um resumo do que está acontecendo na loja.">
        <Link href="/admin/produtos/novo" className="btn-primary !py-2.5 text-xs">
          <FontAwesomeIcon icon={faPlus} />
          Novo produto
        </Link>
      </AdminTitulo>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icon={faClock}
          label="Aguardando pagamento"
          valor={carregando ? "..." : dados.pendentes}
          detalhe={carregando ? "" : dados.pendentes > 0 ? `${formatBRL(dados.aReceber)} a confirmar` : "Nada pendente"}
          href="/admin/pedidos?status=pendente"
          destaque={!carregando && dados.pendentes > 0}
        />
        <Indicador
          icon={faCoins}
          label="Vendas confirmadas no mês"
          valor={carregando ? "..." : formatBRL(dados.vendasMes)}
          detalhe="Pedidos pagos, em preparo, enviados ou entregues"
          href="/admin/pedidos"
        />
        <Indicador
          icon={faBoxOpen}
          label="Pedidos no mês"
          valor={carregando ? "..." : dados.pedidosMes}
          href="/admin/pedidos"
        />
        <Indicador
          icon={faWineBottle}
          label="Produtos ativos"
          valor={carregando ? "..." : dados.produtosAtivos}
          detalhe={carregando ? "" : `${dados.produtosTotal} cadastrados`}
          href="/admin/produtos"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-primary">Pedidos recentes</h2>
            <Link href="/admin/pedidos" className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-terracotta">
              Ver todos
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>

          {carregando ? (
            <p className="mt-5 text-primary/60">Carregando...</p>
          ) : dados.recentes.length === 0 ? (
            <p className="mt-5 text-primary/60">Os pedidos feitos no site vão aparecer aqui.</p>
          ) : (
            <ul className="mt-4 divide-y divide-cardBorder">
              {dados.recentes.map((pedido) => {
                const info = statusInfo[pedido.status] ?? { label: pedido.status, classe: "bg-primary/10" };
                return (
                  <li key={pedido.id}>
                    <Link href="/admin/pedidos" className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                      <div>
                        <p className="font-medium text-primary">
                          {pedido.profiles?.full_name ?? "Cliente"}{" "}
                          <span className="text-primary/45">#{pedido.id.slice(0, 8)}</span>
                        </p>
                        <p className="text-xs text-primary/50">
                          {new Date(pedido.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          {pedido.frete_servico === "Retirada no local" ? " · Retirada na loja" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${info.classe}`}>
                          {info.label}
                        </span>
                        <span className="w-24 text-right font-display text-lg font-semibold text-terracotta">
                          {formatBRL(pedido.total)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <h2 className="font-display text-2xl font-semibold text-primary">Atalhos</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/admin/produtos/novo" className="btn-outline justify-start !px-5 text-xs">
              <FontAwesomeIcon icon={faPlus} />
              Cadastrar produto
            </Link>
            <Link href="/admin/pedidos?status=pendente" className="btn-outline justify-start !px-5 text-xs">
              <FontAwesomeIcon icon={faClock} />
              Confirmar pagamentos
            </Link>
            <Link href="/admin/configuracoes" className="btn-outline justify-start !px-5 text-xs">
              <FontAwesomeIcon icon={faGear} />
              Frete grátis e desconto
            </Link>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-primary/50">
            Como o Pix é conferido por vocês, abra &quot;Pedidos&quot; depois de receber um pagamento e
            marque o pedido como pago.
          </p>
        </section>
      </div>
    </div>
  );
}
