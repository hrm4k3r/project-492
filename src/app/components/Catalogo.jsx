"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { CATEGORIAS, nomeDaCategoria } from "../../lib/loja";
import { ProdutoCard, ProdutoCardSkeleton } from "./ProdutoCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faSliders } from "@fortawesome/free-solid-svg-icons";

const POR_PAGINA = 12;

const norm = (s = "") =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const opcoesUnicas = (lista, campo) => {
  const mapa = new Map();
  lista.forEach((p) => {
    const v = (p[campo] ?? "").trim();
    if (v && !mapa.has(norm(v))) mapa.set(norm(v), v);
  });
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
};

const FILTROS_VAZIOS = { busca: "", estilo: "", pais: "", marca: "", precoMin: "", precoMax: "", ordem: "recentes" };

const inputClass =
  "w-full rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm outline-none focus:border-gold";

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-primary/60">{label}</span>
      {children}
    </label>
  );
}

export default function Catalogo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoria = searchParams.get("categoria") ?? "";

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erro ao carregar produtos:", error);
        setErro(true);
      } else {
        setProdutos((data ?? []).filter((p) => Array.isArray(p.imagens) && p.imagens.length > 0));
      }
      setLoading(false);
    }
    carregar();
  }, []);

  useEffect(() => {
    setFiltros((f) => ({ ...f, estilo: "", pais: "", marca: "" }));
    setPagina(1);
  }, [categoria]);

  const daCategoria = useMemo(
    () => (categoria ? produtos.filter((p) => p.categoria === categoria) : produtos),
    [produtos, categoria]
  );

  const opcoes = useMemo(
    () => ({
      estilo: opcoesUnicas(daCategoria, "estilo"),
      pais: opcoesUnicas(daCategoria, "pais"),
      marca: opcoesUnicas(daCategoria, "marca"),
    }),
    [daCategoria]
  );

  const visiveis = useMemo(() => {
    const busca = norm(filtros.busca);
    const min = filtros.precoMin === "" ? null : Number(filtros.precoMin);
    const max = filtros.precoMax === "" ? null : Number(filtros.precoMax);

    const lista = daCategoria.filter((p) => {
      if (busca) {
        const texto = norm([p.produto, p.shortdescription, p.marca, p.estilo, p.pais].join(" "));
        if (!texto.includes(busca)) return false;
      }
      if (filtros.estilo && norm(p.estilo) !== norm(filtros.estilo)) return false;
      if (filtros.pais && norm(p.pais) !== norm(filtros.pais)) return false;
      if (filtros.marca && norm(p.marca) !== norm(filtros.marca)) return false;
      if (min !== null && Number(p.valor) < min) return false;
      if (max !== null && Number(p.valor) > max) return false;
      return true;
    });

    if (filtros.ordem === "menor") lista.sort((a, b) => Number(a.valor) - Number(b.valor));
    if (filtros.ordem === "maior") lista.sort((a, b) => Number(b.valor) - Number(a.valor));
    if (filtros.ordem === "nome") lista.sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));
    return lista;
  }, [daCategoria, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensDaPagina = visiveis.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const alterar = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPagina(1);
  };

  const escolherCategoria = (slug) => {
    router.replace(slug ? `/produtos?categoria=${slug}` : "/produtos", { scroll: false });
  };

  const filtrosAtivos =
    filtros.busca || filtros.estilo || filtros.pais || filtros.marca || filtros.precoMin || filtros.precoMax;

  const chip = (ativo) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-300 ${
      ativo
        ? "border-primary bg-primary text-cream"
        : "border-cardBorder bg-white text-primary hover:border-gold hover:text-terracotta"
    }`;

  return (
    <section className="bg-light py-12 md:py-16">
      <div className="container-page">
        <span className="eyebrow">Catálogo</span>
        <h1 className="section-title mt-2">{categoria ? nomeDaCategoria(categoria) : "Todos os produtos"}</h1>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => escolherCategoria("")} className={chip(!categoria)}>
            Todos
          </button>
          {CATEGORIAS.map((c) => (
            <button key={c.slug} onClick={() => escolherCategoria(c.slug)} className={chip(categoria === c.slug)}>
              {c.nome}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40"
            />
            <input
              value={filtros.busca}
              onChange={alterar("busca")}
              placeholder="Buscar por nome, marca, estilo ou país"
              aria-label="Buscar produtos"
              className={`${inputClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltrosAbertos((v) => !v)}
            className="btn-outline justify-center text-sm md:hidden"
          >
            <FontAwesomeIcon icon={faSliders} />
            {filtrosAbertos ? "Ocultar filtros" : "Filtros"}
          </button>
        </div>

        <div
          className={`mt-3 grid grid-cols-2 gap-3 md:grid-cols-6 ${filtrosAbertos ? "" : "hidden"} md:grid`}
        >
          {opcoes.estilo.length > 0 && (
            <Campo label="Estilo">
              <select value={filtros.estilo} onChange={alterar("estilo")} className={inputClass}>
                <option value="">Todos</option>
                {opcoes.estilo.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Campo>
          )}
          {opcoes.pais.length > 0 && (
            <Campo label="País de origem">
              <select value={filtros.pais} onChange={alterar("pais")} className={inputClass}>
                <option value="">Todos</option>
                {opcoes.pais.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Campo>
          )}
          {opcoes.marca.length > 0 && (
            <Campo label="Marca">
              <select value={filtros.marca} onChange={alterar("marca")} className={inputClass}>
                <option value="">Todas</option>
                {opcoes.marca.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Campo>
          )}
          <Campo label="Preço mínimo (R$)">
            <input type="number" min="0" inputMode="decimal" value={filtros.precoMin} onChange={alterar("precoMin")} className={inputClass} />
          </Campo>
          <Campo label="Preço máximo (R$)">
            <input type="number" min="0" inputMode="decimal" value={filtros.precoMax} onChange={alterar("precoMax")} className={inputClass} />
          </Campo>
          <Campo label="Ordenar por">
            <select value={filtros.ordem} onChange={alterar("ordem")} className={inputClass}>
              <option value="recentes">Mais recentes</option>
              <option value="menor">Menor preço</option>
              <option value="maior">Maior preço</option>
              <option value="nome">Nome (A-Z)</option>
            </select>
          </Campo>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-primary/60">
          <span>
            {loading ? "Carregando..." : `${visiveis.length} produto${visiveis.length === 1 ? "" : "s"}`}
          </span>
          {filtrosAtivos && (
            <button
              onClick={() => {
                setFiltros((f) => ({ ...FILTROS_VAZIOS, ordem: f.ordem }));
                setPagina(1);
              }}
              className="font-semibold text-terracotta"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProdutoCardSkeleton key={i} />)
            : itensDaPagina.map((p) => <ProdutoCard key={p.id} produto={p} />)}
        </div>

        {!loading && visiveis.length === 0 && (
          <p className="py-16 text-center text-primary/60">
            {erro
              ? "Não foi possível carregar os produtos agora. Tente novamente em instantes."
              : "Nenhum produto encontrado com esses filtros."}
          </p>
        )}

        {totalPaginas > 1 && (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPagina(n)}
                className={`h-9 w-9 rounded-full text-sm font-semibold transition-all duration-300 ${
                  paginaAtual === n ? "bg-primary text-cream" : "bg-cream text-primary hover:bg-gold/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
