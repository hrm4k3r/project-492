"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import AuthShell from "../../components/AuthShell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";

const TIPOS = {
  signup: {
    titulo: "Confirmar cadastro",
    subtitulo: "Falta só um clique para ativar a sua conta.",
    botao: "Confirmar meu e-mail",
    destino: "/conta",
  },
  recovery: {
    titulo: "Redefinir senha",
    subtitulo: "Clique para continuar e criar uma nova senha.",
    botao: "Continuar",
    destino: "/redefinir-senha",
  },
};

// O link do e-mail leva até aqui e só é consumido quando o cliente clica no botão.
// Links que confirmam direto no clique do e-mail são "gastos" por verificadores
// automáticos (Outlook/Hotmail, antivírus) antes de o cliente abrir.
export default function ConfirmarEmail() {
  const router = useRouter();
  const [params, setParams] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const busca = new URLSearchParams(window.location.search);
    setParams({ tokenHash: busca.get("token_hash"), tipo: busca.get("type") });
  }, []);

  const config = params && TIPOS[params.tipo];

  const confirmar = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.tipo,
    });
    setLoading(false);

    if (error) {
      setError(
        "Este link já foi usado ou expirou. Se você já confirmou o cadastro, é só entrar com seu e-mail e senha."
      );
      return;
    }
    router.push(config.destino);
  };

  if (!params) return null;

  if (!config || !params.tokenHash) {
    return (
      <AuthShell
        titulo="Link inválido"
        subtitulo="Não foi possível validar este link."
        rodape={<Link href="/entrar" className="font-semibold text-terracotta underline">Ir para o login</Link>}
      >
        <p className="rounded-lg bg-sand p-3 text-sm text-primary/75">
          Abra o link direto do e-mail mais recente que enviamos. Se o problema continuar, peça um novo.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo={config.titulo}
      subtitulo={config.subtitulo}
      rodape={
        <>
          Já confirmou?{" "}
          <Link href="/entrar" className="font-semibold text-terracotta underline">Entrar</Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <p className="rounded-lg bg-sand p-3 text-sm text-terracotta">{error}</p>}
        <button
          type="button"
          onClick={confirmar}
          disabled={loading}
          className="btn-primary justify-center !py-4 disabled:opacity-60"
        >
          {loading ? "Confirmando..." : config.botao}
          <FontAwesomeIcon icon={faCircleCheck} />
        </button>
      </div>
    </AuthShell>
  );
}
