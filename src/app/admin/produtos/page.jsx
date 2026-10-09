"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { CATEGORIAS, formatBRL, nomeDaCategoria } from "../../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrashCan, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass } from "../ui";

const POR_PAGINA = 15;

const norm = (s = "") => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [situacao, setSituacao] = useState("");
  const [pagina, setPagina] = useState(1);

  const carregar = async () => {
    const { data } = await supabase.from("produtos").select("*").order("created_at", { ascending: false });
    setProdutos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleDelete = async (produto) => {
    if (!confirm(`Remover "${produto.produto}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("produtos").delete().eq("id", produto.id);
    if (error) {
      if (error.code === "23503") {
        alert(
          "Esse produto já foi comprado por algum cliente, então não pode ser excluído (isso apagaria o histórico dos pedidos). Use o botão de status para deixá-lo como Inativo — ele some da loja, mas o histórico continua intacto."
        );
      } else {
        alert("Não foi possível remover o produto: " + error.message);
      }
      return;
    }
    carregar();
  };

  const alternarAtivo = async (produto) => {
    const { error } = await supabase.from("produtos").update({ ativo: !produto.ativo }).eq("id", produto.id);
    if (error) {
      alert("Não foi possível alterar o produto: " + error.message);
      return;
    }
    setProdutos((lista) => lista.map((p) => (p.id === produto.id ? { ...p, ativo: !p.ativo } : p)));
  };

  const visiveis = useMemo(() => {
    const termo = norm(busca.trim());
    return produtos.filter((p) => {
      if (categoria === "sem" && p.categoria) return false;
      if (categoria && categoria !== "sem" && p.categoria !== categoria) return false;
      if (situacao === "ativo" && !p.ativo) return false;
      if (situacao === "inativo" && p.ativo) return false;
      if (!termo) return true;
      return norm([p.produto, p.marca, p.pais, p.estilo].join(" ")).includes(termo);
    });
  }, [produtos, busca, categoria, situacao]);

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itens = visiveis.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const semCategoria = produtos.filter((p) => !p.categoria).length;

  const filtrar = (setter) => (e) => {
    setter(e.target.value);
    setPagina(1);
  };

  return (
    <div>
      <AdminTitulo titulo="Produtos" descricao="Cadastre e organize os rótulos da loja.">
        <Link href="/admin/produtos/novo" className="btn-primary !py-2.5 text-xs">
          <FontAwesomeIcon icon={faPlus} />
          Novo produto
        </Link>
      </AdminTitulo>

      {semCategoria > 0 && (
        <p className="mt-6 rounded-xl bg-gold/20 p-3.5 text-sm text-primary/80">
          {semCategoria} produto{semCategoria > 1 ? "s estão" : " está"} sem categoria e só aparece{semCategoria > 1 ? "m" : ""} em
          &quot;Todos os produtos&quot; na loja.{" "}
          <button onClick={() => { setCategoria("sem"); setPagina(1); }} className="font-medium text-terracotta underline">
            Ver quais
          </button>
        </p>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_14rem_11rem]">
        <div className="relative">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40" />
          <input
            value={busca}
            onChange={filtrar(setBusca)}
            placeholder="Buscar por nome, marca, país ou estilo"
            aria-label="Buscar produtos"
            className={`${inputClass} pl-10`}
          />
        </div>
        <select value={categoria} onChange={filtrar(setCategoria)} aria-label="Categoria" className={inputClass}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.nome}</option>
          ))}
          <option value="sem">Sem categoria</option>
        </select>
        <select value={situacao} onChange={filtrar(setSituacao)} aria-label="Situação" className={inputClass}>
          <option value="">Ativos e inativos</option>
          <option value="ativo">Só ativos</option>
          <option value="inativo">Só inativos</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : produtos.length === 0 ? (
        <div className={`${cardClass} mt-8 text-center`}>
          <p className="font-display text-2xl text-primary">Nenhum produto cadastrado ainda</p>
          <p className="mt-1 text-sm text-primary/60">Comece cadastrando o primeiro rótulo da curadoria.</p>
          <Link href="/admin/produtos/novo" className="btn-primary mt-5">Cadastrar produto</Link>
        </div>
      ) : (
        <div className={`${cardClass} mt-6 overflow-x-auto !p-0`}>
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cardBorder text-[11px] uppercase tracking-[0.16em] text-primary/50">
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-3 py-3 font-medium">Categoria</th>
                <th className="px-3 py-3 font-medium">Preço</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr key={p.id} className="border-b border-cardBorder/60 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-sand">
                        {p.imagens?.[0] && (
                          <Image src={p.imagens[0]} alt="" fill sizes="44px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-primary">{p.produto}</p>
                        <p className="truncate text-xs text-primary/50">
                          {[p.marca, p.pais, p.estilo].filter(Boolean).join(" · ") || "Sem detalhes"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-primary/70">
                    {nomeDaCategoria(p.categoria) || <span className="text-terracotta">Sem categoria</span>}
                  </td>
                  <td className="px-3 py-3 font-display text-lg font-semibold text-terracotta">{formatBRL(p.valor)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => alternarAtivo(p)}
                      title={p.ativo ? "Clique para desativar" : "Clique para ativar"}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${
                        p.ativo ? "bg-olive/20 text-olive" : "bg-primary/10 text-primary/50"
                      }`}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/produtos/${p.id}`}
                        aria-label={`Editar ${p.produto}`}
                        className="text-primary/55 transition-colors hover:text-terracotta"
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p)}
                        aria-label={`Remover ${p.produto}`}
                        className="text-primary/55 transition-colors hover:text-terracotta"
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visiveis.length === 0 && (
            <p className="p-8 text-center text-primary/60">Nenhum produto encontrado com esses filtros.</p>
          )}
        </div>
      )}

      {!loading && visiveis.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-primary/60">
          <span>
            {visiveis.length} produto{visiveis.length === 1 ? "" : "s"}
          </span>
          {totalPaginas > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="rounded-full border border-cardBorder bg-white px-4 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                {paginaAtual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="rounded-full border border-cardBorder bg-white px-4 py-1.5 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
