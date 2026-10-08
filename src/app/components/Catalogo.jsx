"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { CATEGORIAS, DESCRICAO_CATALOGO, nomeDaCategoria, whatsappLink } from "../../lib/loja";
import { ProdutoCard, ProdutoCardSkeleton } from "./ProdutoCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faSliders } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

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

const FILTROS_VAZIOS = { busca: "", estilo: "", pais: "", marca: "", precoMin: "", precoMax: "" };

const inputClass =
  "w-full rounded-lg border border-cardBorder bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-gold";

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/55">{label}</span>
      {children}
    </label>
  );
}

export default function Catalogo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoria = searchParams.get("categoria") ?? "";
  const categoriaAtual = CATEGORIAS.find((c) => c.slug === categoria);

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [ordem, setOrdem] = useState("recentes");
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

  const contagem = useMemo(() => {
    const mapa = {};
    produtos.forEach((p) => {
      if (p.categoria) mapa[p.categoria] = (mapa[p.categoria] ?? 0) + 1;
    });
    return mapa;
  }, [produtos]);

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

    if (ordem === "menor") lista.sort((a, b) => Number(a.valor) - Number(b.valor));
    if (ordem === "maior") lista.sort((a, b) => Number(b.valor) - Number(a.valor));
    if (ordem === "nome") lista.sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));
    return lista;
  }, [daCategoria, filtros, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensDaPagina = visiveis.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const alterar = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPagina(1);
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS);
    setPagina(1);
  };

  const escolherCategoria = (slug) => {
    router.replace(slug ? `/produtos?categoria=${slug}` : "/produtos", { scroll: false });
  };

  const filtrosAtivos = Object.values(filtros).some(Boolean);

  const chip = (ativo) =>
    `flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
      ativo
        ? "border-primary bg-primary text-cream"
        : "border-cardBorder bg-white text-primary hover:border-gold hover:text-terracotta"
    }`;

  const contador = (n) =>
    n === undefined ? null : (
      <span className="text-[11px] opacity-60">{n}</span>
    );

  return (
    <div className="bg-light">
      <section className="relative overflow-hidden bg-brand text-cream">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,163,106,0.2),transparent_65%)]" />
        <div className="container-page relative py-12 text-center md:py-16">
          <nav aria-label="Você está em" className="text-[11px] uppercase tracking-[0.22em] text-cream/60">
            <Link href="/" className="transition-colors hover:text-gold">Início</Link>
            <span className="mx-2">/</span>
            <Link href="/produtos" className="transition-colors hover:text-gold">Catálogo</Link>
            {categoriaAtual && (
              <>
                <span className="mx-2">/</span>
                <span className="text-cream/90">{categoriaAtual.nome}</span>
              </>
            )}
          </nav>
          <h1 className="mt-5 font-display text-5xl font-medium leading-[1.05] md:text-6xl">
            {categoriaAtual ? categoriaAtual.nome : "Todos os produtos"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-cream/75">
            {categoriaAtual ? categoriaAtual.descricao : DESCRICAO_CATALOGO}
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => escolherCategoria("")} className={chip(!categoria)}>
            Todos {!loading && contador(produtos.length)}
          </button>
          {CATEGORIAS.map((c) => (
            <button key={c.slug} onClick={() => escolherCategoria(c.slug)} className={chip(categoria === c.slug)}>
              {c.nome} {!loading && contador(contagem[c.slug] ?? 0)}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-44">
            <button
              type="button"
              onClick={() => setFiltrosAbertos((v) => !v)}
              className="btn-outline w-full justify-center text-sm lg:hidden"
            >
              <FontAwesomeIcon icon={faSliders} />
              {filtrosAbertos ? "Ocultar filtros" : "Filtrar produtos"}
            </button>

            <div
              className={`card-surface mt-3 flex-col gap-5 p-5 lg:mt-0 lg:flex ${filtrosAbertos ? "flex" : "hidden"}`}
            >
              <div className="hidden items-center justify-between lg:flex">
                <h2 className="font-display text-2xl font-semibold text-primary">Filtrar</h2>
                {filtrosAtivos && (
                  <button onClick={limparFiltros} className="text-xs font-medium text-terracotta underline">
                    Limpar
                  </button>
                )}
              </div>

              <div className="relative">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40"
                />
                <input
                  value={filtros.busca}
                  onChange={alterar("busca")}
                  placeholder="Buscar rótulo, marca ou país"
                  aria-label="Buscar produtos"
                  className={`${inputClass} pl-9`}
                />
              </div>

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

              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/55">Faixa de preço (R$)</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <input
                    type="number" min="0" inputMode="decimal" placeholder="Mín."
                    aria-label="Preço mínimo"
                    value={filtros.precoMin} onChange={alterar("precoMin")} className={inputClass}
                  />
                  <input
                    type="number" min="0" inputMode="decimal" placeholder="Máx."
                    aria-label="Preço máximo"
                    value={filtros.precoMax} onChange={alterar("precoMax")} className={inputClass}
                  />
                </div>
              </div>

              {filtrosAtivos && (
                <button onClick={limparFiltros} className="btn-outline justify-center text-xs lg:hidden">
                  Limpar filtros
                </button>
              )}
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cardBorder pb-4">
              <p className="text-sm text-primary/65">
                {loading ? "Carregando..." : `${visiveis.length} produto${visiveis.length === 1 ? "" : "s"}`}
              </p>
              <label className="flex items-center gap-2 text-sm text-primary/65">
                Ordenar por
                <select
                  value={ordem}
                  onChange={(e) => setOrdem(e.target.value)}
                  className="rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-primary outline-none focus:border-gold"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="menor">Menor preço</option>
                  <option value="maior">Maior preço</option>
                  <option value="nome">Nome (A-Z)</option>
                </select>
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:gap-5 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <ProdutoCardSkeleton key={i} />)
                : itensDaPagina.map((p) => <ProdutoCard key={p.id} produto={p} />)}
            </div>

            {!loading && visiveis.length === 0 && (
              <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cardBorder bg-white px-6 py-14 text-center">
                <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="h-14 w-auto opacity-70" />
                <h2 className="mt-5 font-display text-3xl font-medium text-primary">
                  {erro ? "Não conseguimos carregar agora" : "Nada por aqui ainda"}
                </h2>
                <p className="mt-2 max-w-md text-primary/65">
                  {erro
                    ? "Tente novamente em instantes."
                    : filtrosAtivos
                    ? "Nenhum produto combina com esses filtros. Que tal ajustar a busca?"
                    : categoria
                    ? `Estamos preparando a seleção de ${nomeDaCategoria(categoria).toLowerCase()}.`
                    : "Estamos preparando a curadoria. Volte em breve!"}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {filtrosAtivos && (
                    <button onClick={limparFiltros} className="btn-primary">Limpar filtros</button>
                  )}
                  <Link
                    href={whatsappLink("Olá! Gostaria de uma sugestão da curadoria.")}
                    target="_blank"
                    className="btn-outline"
                  >
                    <FontAwesomeIcon icon={faWhatsapp} />
                    Falar com a curadoria
                  </Link>
                </div>
              </div>
            )}

            {totalPaginas > 1 && (
              <div className="mt-10 flex flex-wrap justify-center gap-2">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setPagina(n);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`h-10 w-10 rounded-full text-sm font-medium transition-all duration-300 ${
                      paginaAtual === n ? "bg-primary text-cream" : "bg-white text-primary hover:bg-gold/30"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
