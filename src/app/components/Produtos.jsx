"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../config/supabase";
import { CATEGORIAS } from "../../lib/loja";
import { ProdutoCard, ProdutoCardSkeleton } from "./ProdutoCard";

const DESTAQUES = 8;

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(DESTAQUES * 2);

      if (error) {
        console.error("Erro ao carregar produtos:", error);
      } else {
        setProdutos((data ?? []).filter((p) => Array.isArray(p.imagens) && p.imagens.length > 0).slice(0, DESTAQUES));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <section id="produtos" className="bg-light py-20">
      <div className="container-page flex flex-col items-center">
        <span className="eyebrow">Nossa seleção</span>
        <h2 className="section-title mt-2 text-center">Produtos</h2>
        <p className="mt-3 max-w-xl text-center text-primary/60">
          Cervejas, vinhos, queijos e cafés escolhidos com olhar atento para
          qualidade, origem e sabor.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {CATEGORIAS.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              className="rounded-full border border-cardBorder bg-white px-4 py-2 text-sm font-medium text-primary transition-colors duration-300 hover:border-gold hover:text-terracotta"
            >
              {c.nome}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid w-full grid-cols-2 gap-5 md:grid-cols-4">
          {loading
            ? Array.from({ length: DESTAQUES }).map((_, i) => <ProdutoCardSkeleton key={i} />)
            : produtos.map((p) => <ProdutoCard key={p.id} produto={p} />)}
        </div>

        {!loading && produtos.length === 0 && (
          <p className="py-10 text-center text-primary/60">
            Nenhum produto disponível no momento. Volte em breve!
          </p>
        )}

        <Link href="/produtos" className="btn-primary mt-10">
          Ver catálogo completo
        </Link>
      </div>
    </section>
  );
}
