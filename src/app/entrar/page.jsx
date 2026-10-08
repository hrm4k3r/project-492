"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { destinoSeguro, sufixoVoltar } from "../../lib/voltar";
import AuthShell from "../components/AuthShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-cardBorder bg-white px-4 py-3 text-primary outline-none transition-colors focus:border-gold";

export default function Entrar() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      const mensagens = {
        "Invalid login credentials": "E-mail ou senha incorretos.",
        "Email not confirmed": "Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.",
      };
      setError(mensagens[error.message] ?? error.message);
      return;
    }
    router.push(destinoSeguro("/conta"));
  };

  return (
    <AuthShell
      titulo="Entrar"
      subtitulo="Acesse sua conta para finalizar compras e ver seus pedidos."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link href={`/cadastro${sufixoVoltar()}`} className="font-semibold text-terracotta underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input
            id="email" required type="email" name="email" autoComplete="email"
            value={form.email} onChange={handleChange} className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Senha</label>
          <input
            id="password" required type="password" name="password" autoComplete="current-password"
            value={form.password} onChange={handleChange} className={inputClass}
          />
        </div>

        {error && <p className="rounded-lg bg-sand p-3 text-sm text-terracotta">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-1 justify-center !py-4 disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
          <FontAwesomeIcon icon={faRightToBracket} />
        </button>
      </form>
    </AuthShell>
  );
}
