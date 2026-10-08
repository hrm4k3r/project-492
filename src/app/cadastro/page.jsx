"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../config/supabase";
import { destinoSeguro, sufixoVoltar } from "../../lib/voltar";
import AuthShell from "../components/AuthShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-cardBorder bg-white px-4 py-3 text-primary outline-none transition-colors focus:border-gold";

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
      router.push(destinoSeguro("/conta"));
    } else {
      setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-light px-5 py-16">
        <div className="card-surface flex w-full max-w-md flex-col items-center gap-4 p-10 text-center">
          <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="text-5xl text-terracotta" />
          <h1 className="font-display text-4xl font-medium text-primary">Quase lá!</h1>
          <p className="text-primary/65">
            Enviamos um link de confirmação para <strong>{form.email}</strong>.
            Clique no link do e-mail para ativar sua conta e depois volte para entrar.
          </p>
          <Link href={`/entrar${sufixoVoltar()}`} className="btn-primary mt-2">Já confirmei, entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      titulo="Criar conta"
      subtitulo="Cadastre-se para finalizar compras, acompanhar pedidos e ganhar desconto na primeira compra."
      rodape={
        <>
          Já tem conta?{" "}
          <Link href={`/entrar${sufixoVoltar()}`} className="font-semibold text-terracotta underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="nome" className={labelClass}>Nome completo</label>
          <input id="nome" required type="text" name="nome" autoComplete="name" value={form.nome} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="telefone" className={labelClass}>Telefone</label>
          <input id="telefone" required type="tel" name="telefone" autoComplete="tel" value={form.telefone} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input id="email" required type="email" name="email" autoComplete="email" value={form.email} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Senha</label>
          <input id="password" required type="password" name="password" autoComplete="new-password" value={form.password} onChange={handleChange} className={inputClass} />
          <p className="mt-1.5 text-xs text-primary/50">Mínimo de 6 caracteres.</p>
        </div>

        {error && <p className="rounded-lg bg-sand p-3 text-sm text-terracotta">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-1 justify-center !py-4 disabled:opacity-60">
          {loading ? "Criando conta..." : "Criar conta"}
          <FontAwesomeIcon icon={faUserPlus} />
        </button>

        <p className="text-center text-xs text-primary/50 lg:text-left">
          Ao criar a conta, você confirma ter 18 anos ou mais.
        </p>
      </form>
    </AuthShell>
  );
}
