"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAward, faCartPlus, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "../context/CartContext";
import { formatBRL } from "../../lib/loja";
import { semOtimizar } from "../../lib/imagem";

const isPremiado = (text = "") => /pr[eê]mio|premiad/i.test(text);

export function ProdutoCard({ produto }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const { id, produto: titulo, shortdescription, valor, imagens, marca, pais, estilo } = produto;
  const origem = [marca, pais].filter(Boolean).join(" · ");

  const handleAdd = () => {
    addItem(produto);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="card-surface group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
      <Link href={`/detalhes?id=${id}`} className="relative block aspect-[4/5] overflow-hidden bg-sand">
        <Image
          src={imagens[0]}
          unoptimized={semOtimizar(imagens[0])}
          alt={titulo}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {isPremiado(shortdescription) ? (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gold">
            <FontAwesomeIcon icon={faAward} />
            Premiado
          </span>
        ) : (
          estilo && (
            <span className="absolute left-3 top-3 rounded-full bg-light/95 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary/80">
              {estilo}
            </span>
          )
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {origem && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/50">{origem}</p>
        )}
        <Link href={`/detalhes?id=${id}`}>
          <h3 className="font-display text-[1.35rem] font-semibold leading-tight text-primary transition-colors duration-300 hover:text-terracotta">
            {titulo}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-primary/60">{shortdescription}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-xl text-terracotta">{formatBRL(valor)}</span>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-cream transition-all duration-300 ${
              added ? "bg-olive" : "bg-primary hover:bg-terracotta"
            }`}
          >
            <FontAwesomeIcon icon={added ? faCheck : faCartPlus} />
            {added ? "Adicionado" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ProdutoCardSkeleton = () => (
  <div className="card-surface flex flex-col overflow-hidden">
    <div className="aspect-square animate-pulse bg-cardBorder" />
    <div className="flex flex-col gap-3 p-5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-cardBorder" />
      <div className="h-3 w-full animate-pulse rounded bg-cardBorder" />
      <div className="h-6 w-1/3 animate-pulse rounded bg-cardBorder" />
    </div>
  </div>
);
