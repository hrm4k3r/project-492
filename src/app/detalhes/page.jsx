"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAward, faMinus, faPlus, faCartPlus, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "../context/CartContext";

const isPremiado = (text = "") => /pr[eê]mio|premiad/i.test(text);

export default function Detalhes() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { addItem } = useCart();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [count, setCount] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    async function fetchProduto() {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar produto:", error);
      }
      setProduto(data ?? null);
      setLoading(false);
    }
    fetchProduto();
  }, [id]);

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center bg-light py-20">
        <p className="text-primary/60">Carregando produto...</p>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-light py-20 text-center">
        <p className="text-primary/70">Não encontramos esse produto.</p>
        <Link href="/#produtos" className="btn-primary">Ver todos os produtos</Link>
      </div>
    );
  }

  const numberFormatted = Number(produto.valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const imagens = produto.imagens || [];

  return (
    <div className="bg-light py-12 md:py-16">
      <div className="container-page grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-card">
            <Image
              src={imagens[activeImage]}
              alt={produto.produto}
              fill
              sizes="(min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
            {isPremiado(produto.shortdescription) && (
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
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
                  className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === activeImage ? "border-terracotta" : "border-transparent"
                  }`}
                >
                  <Image src={img} alt={produto.produto} fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-primary">
          <h1 className="font-display text-3xl md:text-4xl">{produto.produto}</h1>
          <p className="mt-3 text-primary/60">{produto.shortdescription}</p>
          <p className="mt-6 font-display text-3xl text-terracotta">{numberFormatted}</p>

          <div className="mt-8 flex items-center gap-5">
            <div className="flex items-center gap-4 rounded-full border border-cardBorder px-4 py-2">
              <button aria-label="Diminuir quantidade" onClick={() => setCount(Math.max(1, count - 1))} className="text-primary/60 hover:text-terracotta">
                <FontAwesomeIcon icon={faMinus} />
              </button>
              <span className="w-6 text-center">{count}</span>
              <button aria-label="Aumentar quantidade" onClick={() => setCount(count + 1)} className="text-primary/60 hover:text-terracotta">
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>

            <button
              onClick={() => {
                addItem(produto, count);
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-semibold tracking-wide text-cream transition-all duration-300 ${
                added ? "bg-olive" : "bg-primary hover:bg-terracotta"
              }`}
            >
              <FontAwesomeIcon icon={added ? faCheck : faCartPlus} />
              {added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
            </button>
          </div>

          <div className="mt-10 border-t border-cardBorder pt-6 text-sm text-primary/60">
            <p>Queijo artesanal, produzido com leite cru na Fazenda Santo Antônio, em Alagoa &mdash; MG.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
