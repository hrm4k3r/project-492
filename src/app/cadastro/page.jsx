"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";

export default function Cadastro() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.nome, phone: form.telefone },
      },
    });
    setLoading(false);

    if (error) {
      setError(
        error.message === "User already registered"
          ? "Já existe uma conta com esse e-mail."
          : error.message
      );
      return;
    }

    if (data.session) {
      router.push("/conta");
    } else {
      setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-light px-5 py-16">
        <div className="card-surface flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
          <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="text-4xl text-terracotta" />
          <h1 className="font-display text-2xl text-primary">Quase lá!</h1>
          <p className="text-sm text-primary/60">
            Enviamos um link de confirmação para <strong>{form.email}</strong>.
            Clique no link do e-mail para ativar sua conta e depois volte para entrar.
          </p>
          <Link href="/entrar" className="btn-outline text-sm">Já confirmei, entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-light px-5 py-16">
      <div className="card-surface w-full max-w-sm p-8">
        <h1 className="text-center font-display text-2xl text-primary">Criar conta</h1>
        <p className="mt-2 text-center text-sm text-primary/60">
          Cadastre-se para acompanhar seus pedidos.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-primary">Nome completo</label>
            <input
              required
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-primary">Telefone</label>
            <input
              required
              type="tel"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
            />
          </div>
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
            {loading ? "Criando conta..." : "Criar conta"}
            <FontAwesomeIcon icon={faUserPlus} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-primary/60">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-terracotta">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
