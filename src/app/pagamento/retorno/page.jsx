"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../../../config/supabase";
import { formatBRL, whatsappLink, LOJA } from "../../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faArrowRotateRight,
  faStore,
  faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

const POLL_INTERVAL = 3000; // 3 segundos
const POLL_MAX = 10;        // máx. 30 segundos de polling

function RetornoConteudo() {
  const params = useSearchParams();
  const orderId = params.get("pedido");

  const [order, setOrder] = useState(null);
  const [tentativas, setTentativas] = useState(0);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!orderId) {
      setErro("ID do pedido não encontrado na URL.");
      return;
    }

    let cancelado = false;

    async function buscarStatus() {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, frete_servico")
        .eq("id", orderId)
        .single();

      if (cancelado) return;

      if (error || !data) {
        setErro("Não foi possível carregar o pedido.");
        return;
      }

      setOrder(data);

      // Continua fazendo polling se ainda pendente e dentro do limite
      if (data.status === "pendente") {
        setTentativas((t) => {
          if (t < POLL_MAX) {
            setTimeout(buscarStatus, POLL_INTERVAL);
            return t + 1;
          }
          return t;
        });
      }
    }

    buscarStatus();
    return () => { cancelado = true; };
  }, [orderId]);

  const codigoPedido = orderId?.slice(0, 8).toUpperCase() ?? "";
  const retirada = order?.frete_servico === "Retirada no local";

  if (erro) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-light px-5 py-16 text-center">
        <p className="text-primary/65">{erro}</p>
        <Link href="/conta" className="btn-primary">Ver meus pedidos</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-light px-5 py-16 text-center">
        <FontAwesomeIcon icon={faArrowRotateRight} className="animate-spin text-3xl text-gold" />
        <p className="text-primary/65">Verificando pagamento...</p>
      </div>
    );
  }

  if (order.status === "pago") {
    const mensagemWhats = `Olá! Meu pagamento do pedido #${codigoPedido} (${formatBRL(order.total)}) foi confirmado. 🎉`;
    return (
      <div className="bg-light px-5 py-12 md:py-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="card-surface flex flex-col items-center gap-5 p-8 text-center md:p-12">
            <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="h-14 w-auto" />
            <FontAwesomeIcon icon={faCircleCheck} className="text-5xl text-olive" />
            <div>
              <p className="eyebrow text-gold">Pedido #{codigoPedido}</p>
              <h1 className="mt-2 font-display text-4xl font-medium text-primary md:text-5xl">
                Pagamento confirmado!
              </h1>
              <p className="mt-4 max-w-sm text-primary/70">
                {retirada
                  ? "Vamos combinar o horário de retirada pelo WhatsApp."
                  : "Estamos preparando seu pedido com carinho."}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/conta" className="btn-primary justify-center">
                <FontAwesomeIcon icon={faBoxOpen} />
                Ver meus pedidos
              </Link>
              {retirada && (
                <Link
                  href={whatsappLink(`Pedido #${codigoPedido} pago! Quero combinar a retirada.`)}
                  target="_blank"
                  className="btn-gold justify-center"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                  Combinar retirada
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Status ainda pendente (polling em andamento ou esgotado)
  const pollingAtivo = tentativas < POLL_MAX;
  const mensagemWhats = `Olá! Acabei de pagar o pedido #${codigoPedido} (${formatBRL(order.total)}) e aguardo a confirmação.`;

  return (
    <div className="bg-light px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="card-surface flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="h-14 w-auto opacity-70" />
          <div>
            <p className="eyebrow text-gold">Pedido #{codigoPedido}</p>
            <h1 className="mt-2 font-display text-4xl font-medium text-primary">
              {pollingAtivo ? "Aguardando confirmação..." : "Pagamento em processamento"}
            </h1>
            {pollingAtivo ? (
              <p className="mt-4 text-primary/70">
                Verificando o status do seu pagamento automaticamente...
              </p>
            ) : (
              <p className="mt-4 text-primary/70">
                Seu pagamento ainda está sendo processado. Você pode acompanhar
                o status em{" "}
                <Link href="/conta" className="font-medium text-terracotta underline">
                  Minha conta
                </Link>{" "}
                ou falar com a gente pelo WhatsApp.
              </p>
            )}
          </div>

          {pollingAtivo ? (
            <FontAwesomeIcon icon={faArrowRotateRight} className="animate-spin text-3xl text-gold" />
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/conta" className="btn-outline justify-center">
                <FontAwesomeIcon icon={faBoxOpen} />
                Minha conta
              </Link>
              <Link
                href={whatsappLink(mensagemWhats)}
                target="_blank"
                className="btn-gold justify-center"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                Falar no WhatsApp
              </Link>
            </div>
          )}

          {retirada && (
            <p className="flex items-start gap-3 rounded-xl border border-cardBorder p-4 text-sm leading-relaxed text-primary/75">
              <FontAwesomeIcon icon={faStore} className="mt-0.5 text-terracotta" />
              Retirada na loja: {LOJA.endereco}. Combinamos o horário pelo WhatsApp após a confirmação.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RetornoPagamento() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-light px-5 py-16 text-center">
          <FontAwesomeIcon icon={faArrowRotateRight} className="animate-spin text-3xl text-gold" />
          <p className="text-primary/65">Verificando pagamento...</p>
        </div>
      }
    >
      <RetornoConteudo />
    </Suspense>
  );
}
