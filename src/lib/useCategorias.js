"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../config/supabase";
import { CATEGORIAS as PADRAO } from "./loja";

// Cache em módulo para evitar múltiplas requisições ao Supabase.
let cache = null;
let pendente = null;

function carregar() {
  if (cache) return Promise.resolve(cache);
  if (!pendente) {
    pendente = supabase
      .from("categorias")
      .select("slug, nome, descricao, ordem")
      .eq("ativa", true)
      .order("ordem")
      .then(({ data }) => {
        cache = data?.length ? data : PADRAO;
        return cache;
      })
      .catch(() => PADRAO)
      .finally(() => { pendente = null; });
  }
  return pendente;
}

/** Invalida o cache — chame após criar/editar/excluir categorias no admin. */
export function invalidarCategorias() {
  cache = null;
}

/**
 * Retorna a lista de categorias ativas do banco.
 * Enquanto carrega, retorna o valor hardcoded do loja.js como fallback
 * para evitar flash de conteúdo vazio.
 */
export function useCategorias() {
  const [categorias, setCategorias] = useState(cache ?? PADRAO);

  useEffect(() => {
    let ativo = true;
    carregar().then((cats) => { if (ativo) setCategorias(cats); });
    return () => { ativo = false; };
  }, []);

  return categorias;
}
