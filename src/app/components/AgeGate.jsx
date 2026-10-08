"use client";
import { useEffect, useRef, useState } from "react";
import { LOJA } from "../../lib/loja";

const CHAVE = "maioridade-confirmada";
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

export default function AgeGate() {
  const [estado, setEstado] = useState("pergunta");
  const botaoRef = useRef(null);

  useEffect(() => {
    try {
      const salvo = Number(localStorage.getItem(CHAVE));
      if (salvo && Date.now() - salvo < VALIDADE_MS) setEstado("liberado");
    } catch {
      // sem localStorage: a confirmação é pedida a cada visita
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = estado === "liberado" ? "" : "hidden";
    if (estado === "pergunta") botaoRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [estado]);

  const confirmar = () => {
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {
      // ignora falha de escrita
    }
    setEstado("liberado");
  };

  if (estado === "liberado") return null;

  return (
    <div
      data-agegate
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-titulo"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/95 px-5 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-light p-8 text-center shadow-2xl">
        <p className="eyebrow">{LOJA.nome}</p>
        {estado === "pergunta" ? (
          <>
            <h2 id="agegate-titulo" className="mt-3 font-display text-2xl text-primary">
              Você tem 18 anos ou mais?
            </h2>
            <p className="mt-3 text-sm text-primary/70">
              Nossa loja vende bebidas alcoólicas. A venda e o acesso ao catálogo
              são permitidos apenas para maiores de 18 anos.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button ref={botaoRef} onClick={confirmar} className="btn-primary justify-center">
                Sim, tenho 18 anos ou mais
              </button>
              <button onClick={() => setEstado("negado")} className="btn-outline justify-center">
                Não, sou menor de idade
              </button>
            </div>
            <p className="mt-5 text-xs text-primary/50">Beba com moderação.</p>
          </>
        ) : (
          <>
            <h2 id="agegate-titulo" className="mt-3 font-display text-2xl text-primary">
              Acesso indisponível
            </h2>
            <p className="mt-3 text-sm text-primary/70">
              Este site é destinado apenas a maiores de 18 anos. Volte quando
              completar a maioridade.
            </p>
            <button
              onClick={() => setEstado("pergunta")}
              className="mt-5 text-xs text-primary/50 underline"
            >
              Cliquei sem querer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
