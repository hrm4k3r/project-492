"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../config/supabase";
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
    <section id="produtos" className="bg-sand py-20 md:py-24">
      <div className="container-page flex flex-col items-center">
        <span className="eyebrow">Em destaque</span>
        <h2 className="section-title mt-3 text-center">Novidades na curadoria</h2>
        <span className="filete mt-6" />
        <p className="mt-5 max-w-xl text-center text-primary/65">
          Rótulos escolhidos com olhar atento para qualidade, origem e sabor.
        </p>

        <div className="mt-12 grid w-full grid-cols-2 gap-5 md:grid-cols-4">
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
