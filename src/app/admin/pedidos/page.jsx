"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../config/supabase";
import { formatBRL } from "../../../lib/loja";
import { MOTOBOY_SERVICO } from "../../../lib/motoboy";
import { valorNoPix } from "../../../lib/pix";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faLocationDot, faMagnifyingGlass, faStore } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, numeroWhatsapp, statusInfo } from "../ui";

const statusOptions = ["pendente", "pago", "preparando", "enviado", "entregue", "cancelado"];

const abas = [
  ["todos", "Todos"],
  ["pendente", "Aguardando pagamento"],
  ["pago", "Pagos"],
  ["preparando", "Preparando"],
  ["enviado", "Enviados"],
  ["entregue", "Entregues"],
  ["cancelado", "Cancelados"],
];

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("todos");
  const [busca, setBusca] = useState("");
  const [salvandoId, setSalvandoId] = useState(null);
  const [emitindoId, setEmitindoId] = useState(null);
  const [etiquetandoId, setEtiquetandoId] = useState(null);
  const [atualizandoEntregas, setAtualizandoEntregas] = useState(false);

  useEffect(() => {
    const inicial = new URLSearchParams(window.location.search).get("status");
    if (inicial && abas.some(([valor]) => valor === inicial)) setAba(inicial);
  }, []);

  const carregar = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), profiles(full_name, phone), addresses(*)")
      .order("created_at", { ascending: false });
    setPedidos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  // Ao enviar uma entrega por transportadora/Correios, pergunta o código de rastreio (vai no e-mail do cliente).
  const alterarStatus = (pedido, status) => {
    let codigoRastreio;
    const porTransportadora =
      pedido.frete_servico !== "Retirada no local" && pedido.frete_servico !== MOTOBOY_SERVICO;
    if (status === "enviado" && porTransportadora) {
      const resposta = window.prompt("Código de rastreio (opcional). Deixe em branco se não houver:");
      if (resposta === null) return; // cancelou: não altera o status
      codigoRastreio = resposta.trim();
    }
    atualizarStatus(pedido.id, status, codigoRastreio);
  };

  const atualizarStatus = async (id, status, codigoRastreio) => {
    setSalvandoId(id);
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`/api/pedidos/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ status, codigoRastreio }),
    });
    setSalvandoId(null);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert("Não foi possível atualizar o pedido: " + (err.error ?? resp.statusText));
      return;
    }
    setPedidos((lista) =>
      lista.map((p) =>
        p.id === id ? { ...p, status, ...(codigoRastreio ? { codigo_rastreio: codigoRastreio } : {}) } : p
      )
    );
  };

  // Emite a NF-e (ou tenta de novo depois de erro). Atualiza só este pedido na lista.
  const emitirNFe = async (pedido) => {
    setEmitindoId(pedido.id);
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch("/api/bling/nfe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ orderId: pedido.id }),
    });
    const dados = await resp.json().catch(() => ({}));
    const { data: atualizado } = await supabase
      .from("orders")
      .select("nfe_id, nfe_status, nfe_erro")
      .eq("id", pedido.id)
      .maybeSingle();
    setEmitindoId(null);
    if (atualizado) {
      setPedidos((lista) => lista.map((p) => (p.id === pedido.id ? { ...p, ...atualizado } : p)));
    }
    if (!resp.ok) alert("NF-e não emitida: " + (dados.error ?? resp.statusText));
  };

  // Chama a rota de etiqueta (só admin) e devolve { ok, dados }.
  const chamarEtiqueta = async (orderId, acao) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch("/api/melhorenvio/etiqueta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ orderId, acao }),
    });
    const dados = await resp.json().catch(() => ({}));
    return { ok: resp.ok, dados };
  };

  const recarregarEtiqueta = async (id) => {
    const { data } = await supabase
      .from("orders")
      .select("etiqueta_id, etiqueta_status, etiqueta_erro, codigo_rastreio")
      .eq("id", id)
      .maybeSingle();
    if (data) setPedidos((lista) => lista.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  // Gera a etiqueta em duas etapas: prepara (não cobra) e só compra depois de o lojista confirmar o valor.
  const gerarEtiqueta = async (pedido) => {
    setEtiquetandoId(pedido.id);
    try {
      const previa = await chamarEtiqueta(pedido.id, "preparar");
      await recarregarEtiqueta(pedido.id);
      if (!previa.ok) {
        alert("Não foi possível preparar a etiqueta: " + (previa.dados.error ?? "erro desconhecido"));
        return;
      }
      const { servico, preco, prazoDias } = previa.dados;
      const confirmou = confirm(
        `Comprar a etiqueta?

${servico}${prazoDias ? ` · ${prazoDias} dias` : ""}
Valor: ${formatBRL(preco)}

O valor sai do saldo do Melhor Envio e não pode ser desfeito aqui.`
      );
      if (!confirmou) return;

      const compra = await chamarEtiqueta(pedido.id, "comprar");
      await recarregarEtiqueta(pedido.id);
      if (!compra.ok) {
        alert("Etiqueta não comprada: " + (compra.dados.error ?? "erro desconhecido"));
        return;
      }
      alert(
        compra.dados.codigoRastreio
          ? `Etiqueta gerada! Código de rastreio: ${compra.dados.codigoRastreio}`
          : "Etiqueta gerada! O código de rastreio pode levar alguns minutos: use \"Atualizar rastreio\"."
      );
    } finally {
      setEtiquetandoId(null);
    }
  };

  const imprimirEtiqueta = async (pedido) => {
    const janela = window.open("", "_blank"); // abre antes do await para o navegador não bloquear
    setEtiquetandoId(pedido.id);
    const r = await chamarEtiqueta(pedido.id, "imprimir");
    setEtiquetandoId(null);
    if (r.ok && r.dados.url) {
      if (janela) janela.location.href = r.dados.url;
      else window.location.href = r.dados.url;
    } else {
      janela?.close();
      alert("Não foi possível abrir a etiqueta: " + (r.dados.error ?? "erro desconhecido"));
    }
  };

  const atualizarRastreio = async (pedido) => {
    setEtiquetandoId(pedido.id);
    const r = await chamarEtiqueta(pedido.id, "rastreio");
    await recarregarEtiqueta(pedido.id);
    setEtiquetandoId(null);
    if (!r.ok) alert("Não foi possível atualizar o rastreio: " + (r.dados.error ?? "erro desconhecido"));
    else if (!r.dados.codigoRastreio) alert("O código de rastreio ainda não foi liberado. Tente de novo em alguns minutos.");
  };

  // Consulta o Melhor Envio e atualiza sozinho o status dos pedidos com etiqueta (preparando, enviado, entregue).
  const atualizarEntregas = async () => {
    setAtualizandoEntregas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/melhorenvio/entregas", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const dados = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        alert("Não foi possível atualizar as entregas: " + (dados.error ?? resp.statusText));
        return;
      }
      await carregar();
      const n = dados.atualizados?.length ?? 0;
      alert(
        dados.verificados === 0
          ? "Nenhum pedido com etiqueta aguardando entrega."
          : n === 0
          ? `${dados.verificados} envio(s) verificado(s): nenhuma mudança por enquanto.`
          : `${n} pedido(s) atualizado(s) de ${dados.verificados} verificado(s). Os clientes foram avisados por e-mail.`
      );
    } finally {
      setAtualizandoEntregas(false);
    }
  };

  const contagem = useMemo(() => {
    const mapa = { todos: pedidos.length };
    pedidos.forEach((p) => {
      mapa[p.status] = (mapa[p.status] ?? 0) + 1;
    });
    return mapa;
  }, [pedidos]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (aba !== "todos" && p.status !== aba) return false;
      if (!termo) return true;
      return [p.id.slice(0, 8), p.profiles?.full_name, p.profiles?.phone]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [pedidos, aba, busca]);

  return (
    <div>
      <AdminTitulo titulo="Pedidos" descricao="Confirme os pagamentos recebidos por Pix e acompanhe cada pedido.">
        <button type="button" onClick={atualizarEntregas} disabled={atualizandoEntregas} className="btn-outline !py-2.5 text-xs disabled:opacity-60">
          {atualizandoEntregas ? "Atualizando..." : "Atualizar entregas"}
        </button>
      </AdminTitulo>

      <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-2">
        {abas.map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setAba(valor)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              aba === valor
                ? "border-primary bg-primary text-cream"
                : "border-cardBorder bg-white text-primary hover:border-gold"
            }`}
          >
            {rotulo}
            <span className="text-[11px] opacity-60">{contagem[valor] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="relative mt-4 max-w-md">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, telefone ou número do pedido"
          aria-label="Buscar pedidos"
          className={`${inputClass} pl-10`}
        />
      </div>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <p className="mt-8 text-primary/60">
          {pedidos.length === 0 ? "Nenhum pedido recebido ainda." : "Nenhum pedido encontrado com esses filtros."}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {visiveis.map((pedido) => {
            const info = statusInfo[pedido.status] ?? { label: pedido.status, classe: "bg-primary/10 text-primary" };
            const retirada = pedido.frete_servico === "Retirada no local";
            const numero = numeroWhatsapp(pedido.profiles?.phone);
            const primeiroNome = (pedido.profiles?.full_name ?? "").split(" ")[0];
            const mensagem = `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! Aqui é da Curadoria da Mesa, sobre o seu pedido #${pedido.id.slice(0, 8)}.`;

            return (
              <article key={pedido.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-semibold text-primary">
                      {pedido.profiles?.full_name ?? "Cliente"}
                      <span className="ml-2 font-sans text-sm font-normal text-primary/45">#{pedido.id.slice(0, 8)}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-primary/55">
                      {new Date(pedido.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {pedido.profiles?.phone ? ` · ${pedido.profiles.phone}` : ""}
                    </p>
                    {numero && (
                      <a
                        href={`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-olive hover:underline"
                      >
                        <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
                        Falar com o cliente
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${info.classe}`}>
                      {info.label}
                    </span>
                    <select
                      value={pedido.status}
                      disabled={salvandoId === pedido.id}
                      onChange={(e) => alterarStatus(pedido, e.target.value)}
                      aria-label="Alterar status do pedido"
                      className="rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm outline-none focus:border-gold"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{statusInfo[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {pedido.status === "pendente" && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold/15 p-4">
                    <p className="text-sm text-primary/80">
                      Recebeu <strong>{formatBRL(pedido.payment_method === "pix" ? valorNoPix(pedido) : pedido.total)}</strong> por Pix deste cliente?
                    </p>
                    <button
                      onClick={() => atualizarStatus(pedido.id, "pago")}
                      disabled={salvandoId === pedido.id}
                      className="btn-primary !py-2.5 text-xs disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      Confirmar pagamento
                    </button>
                  </div>
                )}

                {["pago", "preparando", "enviado", "entregue"].includes(pedido.status) && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cardBorder bg-white p-4 text-sm">
                    <p className={pedido.nfe_erro ? "text-terracotta" : "text-primary/75"}>
                      {pedido.nfe_status ? (
                        <><strong className="text-primary">NF-e enviada ao Bling</strong> · situação: {pedido.nfe_status}</>
                      ) : pedido.nfe_erro ? (
                        <><strong>NF-e não emitida:</strong> {pedido.nfe_erro}</>
                      ) : (
                        <><strong className="text-primary">NF-e ainda não emitida.</strong> Ela sai sozinha quando o Bling está conectado.</>
                      )}
                    </p>
                    {!pedido.nfe_status && (
                      <button
                        onClick={() => emitirNFe(pedido)}
                        disabled={emitindoId === pedido.id}
                        className="btn-outline !py-2 text-xs disabled:opacity-60"
                      >
                        {emitindoId === pedido.id ? "Emitindo..." : pedido.nfe_erro ? "Tentar de novo" : "Emitir NF-e"}
                      </button>
                    )}
                  </div>
                )}

                {["pago", "preparando", "enviado"].includes(pedido.status) &&
                  !retirada && pedido.frete_servico && pedido.frete_servico !== MOTOBOY_SERVICO && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cardBorder bg-white p-4 text-sm">
                    <div className={pedido.etiqueta_erro && pedido.etiqueta_status !== "gerada" ? "text-terracotta" : "text-primary/75"}>
                      {pedido.etiqueta_status === "gerada" ? (
                        <>
                          <strong className="text-primary">Etiqueta gerada</strong> ({pedido.frete_servico})
                          {pedido.codigo_rastreio ? <> · rastreio <span className="select-all font-medium">{pedido.codigo_rastreio}</span></> : " · aguardando o código de rastreio"}
                        </>
                      ) : pedido.etiqueta_status === "paga" ? (
                        <><strong>Etiqueta paga, mas não gerada.</strong> {pedido.etiqueta_erro} Clique em Gerar etiqueta para concluir (não cobra de novo).</>
                      ) : pedido.etiqueta_status === "comprando" ? (
                        <><strong className="text-primary">Comprando a etiqueta...</strong> Atualize a página em instantes.</>
                      ) : pedido.etiqueta_erro ? (
                        <><strong>Etiqueta não gerada:</strong> {pedido.etiqueta_erro}</>
                      ) : (
                        <><strong className="text-primary">Etiqueta do Melhor Envio</strong> · {pedido.frete_servico}{!pedido.nfe_status && " · emita a NF-e primeiro"}</>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pedido.etiqueta_status === "gerada" ? (
                        <>
                          <button onClick={() => imprimirEtiqueta(pedido)} disabled={etiquetandoId === pedido.id} className="btn-outline !py-2 text-xs disabled:opacity-60">
                            Imprimir etiqueta
                          </button>
                          {!pedido.codigo_rastreio && (
                            <button onClick={() => atualizarRastreio(pedido)} disabled={etiquetandoId === pedido.id} className="btn-outline !py-2 text-xs disabled:opacity-60">
                              Atualizar rastreio
                            </button>
                          )}
                        </>
                      ) : pedido.etiqueta_status !== "comprando" && (
                        <button
                          onClick={() => gerarEtiqueta(pedido)}
                          disabled={etiquetandoId === pedido.id || !pedido.nfe_status}
                          className="btn-outline !py-2 text-xs disabled:opacity-60"
                        >
                          {etiquetandoId === pedido.id ? "Aguarde..." : "Gerar etiqueta"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <ul className="mt-5 space-y-1.5 border-t border-cardBorder pt-4 text-sm text-primary/80">
                  {pedido.order_items?.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span>{item.quantidade}x {item.titulo}</span>
                      <span className="text-primary/55">{formatBRL(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 flex items-start gap-2 text-sm text-primary/70">
                  <FontAwesomeIcon icon={retirada ? faStore : faLocationDot} className="mt-0.5 text-terracotta" />
                  {retirada ? (
                    <span><strong className="text-primary">Retirada na loja</strong> (sem entrega)</span>
                  ) : pedido.addresses ? (
                    <span>
                      <strong className="text-primary">Entregar em:</strong> {pedido.addresses.street}, {pedido.addresses.number}
                      {pedido.addresses.complement ? ` - ${pedido.addresses.complement}` : ""} &mdash;{" "}
                      {pedido.addresses.neighborhood}, {pedido.addresses.city}/{pedido.addresses.state} &mdash; CEP{" "}
                      {pedido.addresses.cep}
                      {pedido.frete_servico ? ` (${pedido.frete_servico})` : ""}
                      {pedido.codigo_rastreio ? ` · Rastreio: ${pedido.codigo_rastreio}` : ""}
                    </span>
                  ) : (
                    <span>Endereço não informado</span>
                  )}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cardBorder pt-4 text-sm text-primary/65">
                  <p>
                    Subtotal {formatBRL(pedido.subtotal)} · Frete {formatBRL(pedido.frete)}
                    {Number(pedido.desconto_pix) > 0 && pedido.status !== "pendente" &&
                      ` · Desconto Pix -${formatBRL(pedido.desconto_pix)}`}
                    {Number(pedido.desconto) > 0 &&
                      ` · Desconto -${formatBRL(pedido.desconto)}${pedido.coupon_code ? ` (${pedido.coupon_code})` : ""}`}
                  </p>
                  <p className="font-display text-2xl font-semibold text-terracotta">
                    Total {formatBRL(pedido.total)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
