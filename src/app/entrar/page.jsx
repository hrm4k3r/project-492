"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";

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
    router.push("/conta");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-light px-5 py-16">
      <div className="card-surface w-full max-w-sm p-8">
        <h1 className="text-center font-display text-2xl text-primary">Entrar</h1>
        <p className="mt-2 text-center text-sm text-primary/60">
          Acesse sua conta para ver seus pedidos.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-primary">E-mail</label>
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-primary">Senha</label>
            <input
              required
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
            />
          </div>

          {error && <p className="text-sm text-terracotta">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary mt-2 justify-center disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"}
            <FontAwesomeIcon icon={faRightToBracket} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-primary/60">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-terracotta">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
