"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../config/supabase";
import AuthShell from "../components/AuthShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-cardBorder bg-white px-4 py-3 text-primary outline-none transition-colors focus:border-gold";

export default function RedefinirSenha() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Só chega aqui com sessão quem clicou no botão do e-mail (página /auth/confirmar).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setTemSessao(Boolean(session)));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/conta");
  };

  if (temSessao === null) return null;

  if (!temSessao) {
    return (
      <AuthShell
        titulo="Link expirado"
        subtitulo="Para criar uma nova senha, peça um novo link."
        rodape={<Link href="/entrar" className="font-semibold text-terracotta underline">Voltar ao login</Link>}
      >
        <Link href="/esqueci-senha" className="btn-primary justify-center !py-4">Pedir novo link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Nova senha" subtitulo="Escolha a nova senha da sua conta.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="senha" className={labelClass}>Nova senha</label>
          <input
            id="senha" required type="password" autoComplete="new-password"
            value={senha} onChange={(e) => setSenha(e.target.value)} className={inputClass}
          />
          <p className="mt-1.5 text-xs text-primary/50">Mínimo de 6 caracteres.</p>
        </div>
        <div>
          <label htmlFor="confirmacao" className={labelClass}>Repita a nova senha</label>
          <input
            id="confirmacao" required type="password" autoComplete="new-password"
            value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={inputClass}
          />
        </div>

        {error && <p className="rounded-lg bg-sand p-3 text-sm text-terracotta">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary justify-center !py-4 disabled:opacity-60">
          {loading ? "Salvando..." : "Salvar nova senha"}
          <FontAwesomeIcon icon={faKey} />
        </button>
      </form>
    </AuthShell>
  );
}
