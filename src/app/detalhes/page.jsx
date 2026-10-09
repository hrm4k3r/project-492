"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAward, faMinus, faPlus, faBagShopping, faCheck, faTruckFast, faQrcode,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { useCart } from "../context/CartContext";
import { ProdutoCard, ProdutoCardSkeleton } from "../components/ProdutoCard";
import { formatBRL, nomeDaCategoria, whatsappLink } from "../../lib/loja";
import { semOtimizar } from "../../lib/imagem";

const isPremiado = (text = "") => /pr[eê]mio|premiad/i.test(text);

function Mensagem({ titulo, texto }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 bg-light px-5 py-20 text-center">
      <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="h-14 w-auto opacity-70" />
      <h1 className="font-display text-3xl font-medium text-primary">{titulo}</h1>
      {texto && <p className="max-w-md text-primary/65">{texto}</p>}
      <Link href="/produtos" className="btn-primary mt-2">Ver o catálogo</Link>
    </div>
  );
}

export default function Detalhes() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { addItem } = useCart();
  const [produto, setProduto] = useState(null);
  const [relacionados, setRelacionados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [count, setCount] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setActiveImage(0);
    setCount(1);
    setRelacionados(null);

    async function fetchProduto() {
      const { data, error } = await supabase.from("produtos").select("*").eq("id", id).maybeSingle();
      if (error) console.error("Erro ao carregar produto:", error);
      setProduto(data ?? null);
      setLoading(false);

      if (!data) return;
      const { data: outros } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .neq("id", data.id)
        .order("created_at", { ascending: false })
        .limit(24);
      const lista = (outros ?? []).filter((p) => p.imagens?.length > 0);
      const mesmaCategoria = lista.filter((p) => data.categoria && p.categoria === data.categoria);
      const demais = lista.filter((p) => !mesmaCategoria.includes(p));
      setRelacionados([...mesmaCategoria, ...demais].slice(0, 4));
    }
    fetchProduto();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center bg-light py-20">
        <p className="text-primary/60">Carregando produto...</p>
      </div>
    );
  }

  if (!produto) {
    return <Mensagem titulo="Não encontramos esse produto" texto="Ele pode ter saído da curadoria. Veja o que temos de novo no catálogo." />;
  }

  const imagens = produto.imagens || [];
  const categoriaNome = nomeDaCategoria(produto.categoria);
  const origem = [produto.marca, produto.pais].filter(Boolean).join(" · ");
  const ficha = [
    ["Categoria", categoriaNome],
    ["Marca", produto.marca],
    ["País de origem", produto.pais],
    ["Estilo", produto.estilo],
  ].filter(([, valor]) => valor);

  return (
    <div className="bg-light">
      <div className="container-page pt-8">
        <nav aria-label="Você está em" className="flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-[0.2em] text-primary/55">
          <Link href="/" className="transition-colors hover:text-terracotta">Início</Link>
          <span>/</span>
          <Link href="/produtos" className="transition-colors hover:text-terracotta">Catálogo</Link>
          {categoriaNome && (
            <>
              <span>/</span>
              <Link href={`/produtos?categoria=${produto.categoria}`} className="transition-colors hover:text-terracotta">
                {categoriaNome}
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="container-page grid grid-cols-1 gap-10 py-8 md:grid-cols-2 md:gap-14 md:py-12">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-cardBorder bg-sand shadow-card">
            <Image
              src={imagens[activeImage]}
              unoptimized={semOtimizar(imagens[activeImage])}
              alt={produto.produto}
              fill
              priority
              sizes="(min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
            {isPremiado(produto.shortdescription) && (
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gold">
                <FontAwesomeIcon icon={faAward} />
                Premiado
              </span>
            )}
          </div>
          {imagens.length > 1 && (
            <div className="mt-4 flex gap-3">
              {imagens.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  className={`relative h-20 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === activeImage ? "border-terracotta" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img} alt="" fill sizes="64px" unoptimized={semOtimizar(img)} className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-primary">
          {origem && (
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-terracotta">{origem}</p>
          )}
          <h1 className="mt-3 font-display text-4xl font-medium leading-[1.08] md:text-5xl">{produto.produto}</h1>
          {produto.shortdescription && (
            <p className="mt-4 text-lg leading-relaxed text-primary/70">{produto.shortdescription}</p>
          )}
          <p className="mt-6 font-display text-4xl font-semibold text-terracotta">{formatBRL(produto.valor)}</p>
          <p className="mt-1 text-sm text-primary/55">Pagamento por Pix. Frete calculado no carrinho.</p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex w-fit items-center gap-5 rounded-full border border-cardBorder bg-white px-5 py-3">
              <button
                aria-label="Diminuir quantidade"
                onClick={() => setCount(Math.max(1, count - 1))}
                className="text-primary/60 transition-colors hover:text-terracotta"
              >
                <FontAwesomeIcon icon={faMinus} />
              </button>
              <span className="w-6 text-center font-medium">{count}</span>
              <button
                aria-label="Aumentar quantidade"
                onClick={() => setCount(count + 1)}
                className="text-primary/60 transition-colors hover:text-terracotta"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>

            <button
              onClick={() => {
                addItem(produto, count);
                setAdded(true);
                setTimeout(() => setAdded(false), 1800);
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2.5 rounded-full px-8 py-4 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-cream transition-all duration-300 sm:flex-none ${
                added ? "bg-olive" : "bg-primary hover:bg-terracotta"
              }`}
            >
              <FontAwesomeIcon icon={added ? faCheck : faBagShopping} />
              {added ? "Adicionado" : "Adicionar ao carrinho"}
            </button>
          </div>

          {added && (
            <Link href="/carrinho" className="mt-3 inline-block text-sm font-medium text-terracotta underline">
              Ir para o carrinho
            </Link>
          )}

          <ul className="mt-8 space-y-3 rounded-2xl border border-cardBorder bg-white p-5 text-sm text-primary/75">
            <li className="flex items-start gap-3">
              <FontAwesomeIcon icon={faTruckFast} className="mt-0.5 text-gold" />
              Entregamos para todo o Brasil, com o frete calculado pelo seu CEP.
            </li>
            <li className="flex items-start gap-3">
              <FontAwesomeIcon icon={faQrcode} className="mt-0.5 text-gold" />
              Pagamento por Pix, com QR Code gerado na hora.
            </li>
            <li className="flex items-start gap-3">
              <FontAwesomeIcon icon={faWhatsapp} className="mt-0.5 text-gold" />
              <span>
                Dúvidas sobre este rótulo?{" "}
                <Link
                  href={whatsappLink(`Olá! Tenho uma dúvida sobre "${produto.produto}".`)}
                  target="_blank"
                  className="font-medium text-terracotta underline"
                >
                  Fale com a curadoria
                </Link>
                .
              </span>
            </li>
          </ul>

          {ficha.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-2xl font-semibold">Ficha do produto</h2>
              <dl className="mt-3 divide-y divide-cardBorder border-y border-cardBorder text-sm">
                {ficha.map(([nome, valor]) => (
                  <div key={nome} className="flex justify-between gap-4 py-3">
                    <dt className="text-primary/55">{nome}</dt>
                    <dd className="text-right font-medium">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <p className="mt-6 text-xs text-primary/50">
            Venda proibida para menores de 18 anos. Beba com moderação.
          </p>
        </div>
      </div>

      {(relacionados === null || relacionados.length > 0) && (
        <section className="bg-sand py-16 md:py-20">
          <div className="container-page">
            <div className="text-center">
              <span className="eyebrow">Continue explorando</span>
              <h2 className="section-title mt-3">Você também pode gostar</h2>
              <span className="filete mt-6" />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {relacionados === null
                ? Array.from({ length: 4 }).map((_, i) => <ProdutoCardSkeleton key={i} />)
                : relacionados.map((p) => <ProdutoCard key={p.id} produto={p} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
