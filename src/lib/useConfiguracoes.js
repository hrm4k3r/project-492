"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../config/supabase";

const PADRAO = { freteGratisAcima: 1000, primeiraCompraPercent: 10 };

let cache = null;
let pendente = null;

function carregar() {
  if (cache) return Promise.resolve(cache);
  if (!pendente) {
    pendente = supabase
      .from("configuracoes")
      .select("chave, valor")
      .then(({ data }) => {
        const cfg = { ...PADRAO };
        (data ?? []).forEach(({ chave, valor }) => {
          if (chave === "frete_gratis_acima") cfg.freteGratisAcima = Number(valor);
          if (chave === "primeira_compra_percent") cfg.primeiraCompraPercent = Number(valor);
        });
        cache = cfg;
        return cfg;
      })
      .catch(() => PADRAO)
      .finally(() => {
        pendente = null;
      });
  }
  return pendente;
}

export function invalidarConfiguracoes() {
  cache = null;
}

export function useConfiguracoes() {
  const [config, setConfig] = useState(cache ?? PADRAO);

  useEffect(() => {
    let ativo = true;
    carregar().then((cfg) => ativo && setConfig(cfg));
    return () => {
      ativo = false;
    };
  }, []);

  return config;
}
