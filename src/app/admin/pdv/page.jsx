"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { formatBRL } from "../../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faMinus, faPlus, faTrashCan, faCheck, faReceipt } from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

const FORMAS = [
  { id: "dinheiro", label: "Dinheiro" },
  { id: "pix", label: "Pix" },
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
];

const norm = (s = "") => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function AdminPdv() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]); // [{ id, quantidade }]
  const [forma, setForma] = useState("");
  const [cliente, setCliente] = useState("");
  const [desconto, setDesconto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null); // { ok, texto }
  const buscaRef = useRef(null);

  const carregar = async () => {
    const { data } = await supabase
      .from("produtos")
      .select("id, produto, valor, estoque, estoque_minimo, ativo, marca")
      .order("produto");
    setProdutos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const filtrados = useMemo(() => {
    const termo = norm(busca.trim());
    return produtos
      .filter((p) => !termo || norm(`${p.produto} ${p.marca ?? ""}`).includes(termo))
      .slice(0, 40);
  }, [produtos, busca]);

  const linhas = carrinho
    .map((c) => ({ ...c, produto: porId.get(c.id) }))
    .filter((l) => l.produto);
  const subtotal = linhas.reduce((t, l) => t + Number(l.produto.valor) * l.quantidade, 0);
  const descontoNum = Math.min(Math.max(Number(String(desconto).replace(",", ".")) || 0, 0), subtotal);
  const total = Math.round((subtotal - descontoNum) * 100) / 100;

  const limite = (p) => (p.estoque == null ? 999 : p.estoque);

  const adicionar = (p) => {
    setAviso(null);
    setCarrinho((lista) => {
      const atual = lista.find((c) => c.id === p.id);
      if (!atual) return limite(p) > 0 ? [...lista, { id: p.id, quantidade: 1 }] : lista;
      return lista.map((c) => (c.id === p.id ? { ...c, quantidade: Math.min(c.quantidade + 1, limite(p)) } : c));
    });
  };

  const mudarQuantidade = (id, delta) => {
    const p = porId.get(id);
    setCarrinho((lista) =>
      lista
        .map((c) => (c.id === id ? { ...c, quantidade: Math.min(c.quantidade + delta, limite(p)) } : c))
        .filter((c) => c.quantidade > 0)
    );
  };

  const remover = (id) => setCarrinho((lista) => lista.filter((c) => c.id !== id));

  const limpar = () => {
    setCarrinho([]);
    setForma("");
    setCliente("");
    setDesconto("");
  };

  const finalizar = async () => {
    setAviso(null);
    if (linhas.length === 0) return setAviso({ ok: false, texto: "Adicione pelo menos um produto." });
    if (!forma) return setAviso({ ok: false, texto: "Escolha a forma de pagamento." });

    setSalvando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/pdv/vender", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          itens: linhas.map((l) => ({ id: l.id, quantidade: l.quantidade })),
          forma,
          cliente: cliente.trim() || undefined,
          desconto: descontoNum,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso({ ok: false, texto: data.error ?? "Não foi possível registrar a venda." });
        await carregar(); // o estoque pode ter mudado (venda online no meio)
        return;
      }
      setAviso({ ok: true, texto: `Venda registrada: ${formatBRL(data.total)}. O estoque já foi atualizado.` });
      limpar();
      await carregar();
      buscaRef.current?.focus();
    } catch {
      setAviso({ ok: false, texto: "Sem conexão. A venda NÃO foi registrada; tente de novo." });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <AdminTitulo titulo="Vender na loja" descricao="Registre vendas presenciais. O estoque é atualizado na hora e o produto sai do site.">
        <Link href="/admin/vendas" className="btn-outline !py-2.5 text-xs">
          <FontAwesomeIcon icon={faReceipt} /> Vendas do balcão
        </Link>
      </AdminTitulo>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className={cardClass}>
          <div className="relative">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40" />
            <input
              ref={buscaRef}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto por nome ou marca"
              aria-label="Buscar produto"
              className={`${inputClass} pl-10`}
              autoFocus
            />
          </div>

          {loading ? (
            <p className="mt-6 text-primary/60">Carregando produtos...</p>
          ) : filtrados.length === 0 ? (
            <p className="mt-6 text-primary/60">Nenhum produto encontrado.</p>
          ) : (
            <ul className="mt-4 divide-y divide-cardBorder">
              {filtrados.map((p) => {
                const esgotado = p.estoque != null && p.estoque <= 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => adicionar(p)}
                      disabled={esgotado}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block font-medium text-primary">{p.produto}</span>
                        <span className="block text-xs text-primary/55">
                          {p.estoque == null ? "Sem controle de estoque" : esgotado ? "Esgotado" : `${p.estoque} em estoque`}
                          {!p.ativo && " · oculto no site"}
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-xl text-primary">{formatBRL(p.valor)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${cardClass} h-fit lg:sticky lg:top-6`}>
          <h2 className="font-display text-2xl font-semibold text-primary">Venda atual</h2>

          {linhas.length === 0 ? (
            <p className="mt-4 text-sm text-primary/55">Toque em um produto da lista para adicionar.</p>
          ) : (
            <ul className="mt-4 divide-y divide-cardBorder">
              {linhas.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{l.produto.produto}</p>
                    <p className="text-xs text-primary/55">{formatBRL(l.produto.valor)} cada</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => mudarQuantidade(l.id, -1)} aria-label="Diminuir" className="flex h-8 w-8 items-center justify-center rounded-full border border-cardBorder text-primary">
                      <FontAwesomeIcon icon={faMinus} className="text-xs" />
                    </button>
                    <span className="w-7 text-center text-sm font-medium">{l.quantidade}</span>
                    <button type="button" onClick={() => mudarQuantidade(l.id, 1)} aria-label="Aumentar" className="flex h-8 w-8 items-center justify-center rounded-full border border-cardBorder text-primary">
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-medium text-primary">
                    {formatBRL(Number(l.produto.valor) * l.quantidade)}
                  </span>
                  <button type="button" onClick={() => remover(l.id)} aria-label={`Remover ${l.produto.produto}`} className="text-primary/40 hover:text-terracotta">
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 grid gap-4">
            <div>
              <p className={labelClass}>Forma de pagamento</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FORMAS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setForma(f.id)}
                    aria-pressed={forma === f.id}
                    className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      forma === f.id ? "border-brand bg-brand text-cream" : "border-cardBorder text-primary hover:border-gold"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="desconto" className={labelClass}>Desconto (R$)</label>
                <input id="desconto" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" className={`${inputClass} mt-1.5`} />
              </div>
              <div>
                <label htmlFor="cliente" className={labelClass}>Cliente (opcional)</label>
                <input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={120} className={`${inputClass} mt-1.5`} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-cardBorder pt-4">
            <span className="text-sm text-primary/60">
              {descontoNum > 0 ? `Subtotal ${formatBRL(subtotal)} · desconto -${formatBRL(descontoNum)}` : "Total"}
            </span>
            <span className="font-display text-3xl font-semibold text-primary">{formatBRL(total)}</span>
          </div>

          {aviso && (
            <p className={`mt-4 flex items-start gap-2 text-sm ${aviso.ok ? "text-olive" : "text-terracotta"}`} role="status">
              {aviso.ok && <FontAwesomeIcon icon={faCheck} className="mt-0.5" />}
              {aviso.texto}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={finalizar} disabled={salvando || linhas.length === 0} className="btn-primary flex-1 !py-3.5 disabled:opacity-60">
              {salvando ? "Registrando..." : "Finalizar venda"}
            </button>
            {linhas.length > 0 && (
              <button type="button" onClick={limpar} disabled={salvando} className="btn-outline !py-3.5 text-xs">
                Limpar
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
