"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../config/supabase";

import { MOTOBOY_PADRAO } from "./motoboy";
import { normalizarRegioes } from "./freteGratis";

const PADRAO = {
  freteGratisAcima: 1000,
  freteGratisRegioes: {}, // { sudeste: 500, ... } valor mínimo por região; vazio = usa o geral
  motoboyPreco: MOTOBOY_PADRAO.preco,
  motoboyCidade: MOTOBOY_PADRAO.cidade,
};

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
          if (chave === "frete_gratis_regioes") cfg.freteGratisRegioes = normalizarRegioes(valor);
          if (chave === "motoboy_preco") cfg.motoboyPreco = Number(valor);
          if (chave === "motoboy_cidade") cfg.motoboyCidade = String(valor ?? "");
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
