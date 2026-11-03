"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../config/supabase";
import AuthShell from "../components/AuthShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-cardBorder bg-white px-4 py-3 text-primary outline-none transition-colors focus:border-gold";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    // Não revelamos se o e-mail tem conta; só avisamos de limite de envios.
    if (error && /rate limit|seconds/i.test(error.message)) {
      setError("Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");
      return;
    }
    setEnviado(true);
  };

  return (
    <AuthShell
      titulo="Esqueci minha senha"
      subtitulo="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      rodape={
        <>
          Lembrou?{" "}
          <Link href="/entrar" className="font-semibold text-terracotta underline">Entrar</Link>
        </>
      }
    >
      {enviado ? (
        <p className="rounded-lg bg-sand p-4 text-sm leading-relaxed text-primary/80">
          Se existir uma conta com <strong>{email}</strong>, enviamos o link para criar uma nova senha.
          Confira também a caixa de spam.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className={labelClass}>E-mail</label>
            <input
              id="email" required type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass}
            />
          </div>

          {error && <p className="rounded-lg bg-sand p-3 text-sm text-terracotta">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary justify-center !py-4 disabled:opacity-60">
            {loading ? "Enviando..." : "Enviar link"}
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
      )}
    </AuthShell>
  );
}
