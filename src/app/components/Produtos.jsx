"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAward, faCartPlus, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "../context/CartContext";

const isPremiado = (text = "") => /pr[eê]mio|premiad/i.test(text);

const Card = ({ produto }) => {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const { id, produto: titulo, shortdescription, valor, imagens } = produto;
  const numberFormatted = Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleAdd = () => {
    addItem(produto);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="card-surface group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
      <Link href={`/detalhes?id=${id}`} className="relative block aspect-square overflow-hidden bg-cream">
        <Image
          src={imagens[0]}
          alt={titulo}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {isPremiado(shortdescription) && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
            <FontAwesomeIcon icon={faAward} />
            Premiado
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link href={`/detalhes?id=${id}`}>
          <h3 className="font-display text-lg text-primary transition-colors duration-300 hover:text-terracotta">
            {titulo}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-primary/60">
          {shortdescription}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-xl text-terracotta">
            {numberFormatted}
          </span>
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
};

const CardSkeleton = () => (
  <div className="card-surface flex flex-col overflow-hidden">
    <div className="aspect-square animate-pulse bg-cardBorder" />
    <div className="flex flex-col gap-3 p-5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-cardBorder" />
      <div className="h-3 w-full animate-pulse rounded bg-cardBorder" />
      <div className="h-6 w-1/3 animate-pulse rounded bg-cardBorder" />
    </div>
  </div>
);

function DatabaseRead({ currentPage, itemsPerPage, produto, loading }) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = produto.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="grid w-full grid-cols-2 gap-5 md:grid-cols-4">
        {Array.from({ length: itemsPerPage }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (pageItems.length === 0) {
    return (
      <p className="py-10 text-center text-primary/60">
        Nenhum produto disponível no momento. Volte em breve!
      </p>
    );
  }

  return (
    <div className="grid w-full grid-cols-2 gap-5 md:grid-cols-4">
      {pageItems.map((item) => {
        if (Array.isArray(item.imagens) && item.imagens.length > 0) {
          return <Card key={item.id} produto={item} />;
        }
        return null;
      })}
    </div>
  );
}

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  const pages = [...Array(totalPages).keys()].map((page) => page + 1);

  return (
    <div className="mt-10 flex gap-2">
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`h-9 w-9 rounded-full text-sm font-semibold transition-all duration-300 ${
            currentPage === page
              ? "bg-primary text-cream"
              : "bg-cream text-primary hover:bg-gold/30"
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};

export default function Produtos() {
  const [currentPage, setCurrentPage] = useState(1);
  const [produto, setProduto] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(produto.length / itemsPerPage));

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao carregar produtos:", error);
      } else {
        setProduto(data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <section id="produtos" className="bg-light py-20">
      <div className="container-page flex flex-col items-center">
        <span className="eyebrow">Nossa produção</span>
        <h2 className="section-title mt-2 text-center">Produtos</h2>
        <p className="mt-3 max-w-xl text-center text-primary/60">
          Queijos maturados, defumados e temperados &mdash; feitos à mão, com
          leite cru e muito cuidado.
        </p>

        <div className="mt-12 flex w-full flex-wrap items-center justify-center">
          <DatabaseRead
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            produto={produto}
            loading={loading}
          />
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </section>
  );
}
