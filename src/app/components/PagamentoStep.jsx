"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { supabase } from "../../../config/supabase";
import { gerarPixCopiaECola } from "../../lib/pix";
import { LOJA, formatBRL, whatsappLink } from "../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy, faCheck, faArrowRotateRight, faCircleCheck, faTriangleExclamation, faStore,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

const PIX_CHAVE = "55498535000126";
const PIX_NOME = "Loja Teste";
const PIX_CIDADE = "Brasil";

const passos = [
  "Abra o app do seu banco e escolha pagar com Pix.",
  "Escaneie o QR Code ou use o código copia e cola.",
  "Envie o comprovante pelo WhatsApp para confirmarmos mais rápido.",
];

export default function PagamentoStep({ order }) {
  const [statusAtual, setStatusAtual] = useState(order.status);
  const [copiaECola, setCopiaECola] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [aindaPendente, setAindaPendente] = useState(false);

  const retirada = order.frete_servico === "Retirada no local";
  const codigoPedido = order.id.slice(0, 8);
  const mensagemWhats = `Olá! Fiz o pedido #${codigoPedido} no site (total ${formatBRL(order.total)}) e já vou pagar o Pix. Segue o comprovante:`;

  useEffect(() => {
    async function gerar() {
      try {
        const codigo = gerarPixCopiaECola({
          chave: PIX_CHAVE,
          nome: PIX_NOME,
          cidade: PIX_CIDADE,
          valor: order.total,
          txid: order.id,
        });
        const qr = await QRCode.toDataURL(codigo, { margin: 1, width: 360 });
        setCopiaECola(codigo);
        setQrCodeUrl(qr);

        await supabase.rpc("salvar_dados_pagamento", {
          pedido_id: order.id,
          metodo: "pix",
          detalhes: { copiaECola: codigo },
        });
      } catch (e) {
        setErro("Não foi possível gerar o Pix. Fale com a gente pelo WhatsApp.");
      }
    }
    if (statusAtual !== "pago") gerar();
  }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  const verificarPagamento = async () => {
    setVerificando(true);
    setAindaPendente(false);
    const { data } = await supabase.from("orders").select("status").eq("id", order.id).single();
    if (data) {
      setStatusAtual(data.status);
      if (data.status === "pendente") setAindaPendente(true);
    }
    setVerificando(false);
  };

  if (statusAtual === "pago") {
    return (
      <div className="card-surface flex flex-col items-center gap-4 p-8 text-center md:p-12">
        <FontAwesomeIcon icon={faCircleCheck} className="text-5xl text-olive" />
        <h1 className="font-display text-4xl font-medium text-primary">Pagamento confirmado!</h1>
        <p className="max-w-sm text-primary/70">
          Recebemos seu pagamento do pedido #{codigoPedido}.{" "}
          {retirada
            ? "Vamos combinar com você o horário da retirada pelo WhatsApp."
            : "Vamos preparar seu pedido com carinho."}
        </p>
        <Link href="/conta" className="btn-primary mt-2">Ver meus pedidos</Link>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="bg-brand px-6 py-8 text-center text-cream md:px-10">
        <Image src="/emblema-creme.png" width={246} height={233} alt="" className="mx-auto h-12 w-auto" />
        <p className="eyebrow mt-5 text-gold">Pedido #{codigoPedido} registrado</p>
        <h1 className="mt-2 font-display text-4xl font-medium md:text-5xl">Falta só o pagamento</h1>
        <p className="mt-4 text-sm text-cream/70">Valor a pagar</p>
        <p className="font-display text-5xl font-semibold text-gold">{formatBRL(order.total)}</p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-cream/80">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          Aguardando pagamento
        </span>
      </div>

      <div className="px-6 py-8 md:px-10 md:py-10">
        {erro && (
          <p className="mb-6 flex items-center gap-2 rounded-xl bg-sand p-3 text-sm text-terracotta">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {erro}
          </p>
        )}

        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="QR Code Pix"
                className="h-60 w-60 rounded-2xl border border-cardBorder bg-white p-2 shadow-soft"
              />
            ) : (
              <div className="h-60 w-60 animate-pulse rounded-2xl bg-sand" />
            )}
          </div>

          <ol className="space-y-4">
            {passos.map((texto, i) => (
              <li key={texto} className="flex items-start gap-3 text-primary/80">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-cream">
                  {i + 1}
                </span>
                <span className="leading-snug">{texto}</span>
              </li>
            ))}
          </ol>
        </div>

        {copiaECola && (
          <div className="mt-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/55">Pix copia e cola</p>
            <p className="mt-2 break-all rounded-xl border border-cardBorder bg-light px-4 py-3 text-xs leading-relaxed text-primary/65 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
              {copiaECola}
            </p>
            <button onClick={copiar} className="btn-primary mt-3 w-full justify-center !py-4">
              <FontAwesomeIcon icon={copiado ? faCheck : faCopy} />
              {copiado ? "Código copiado!" : "Copiar código Pix"}
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button onClick={verificarPagamento} disabled={verificando} className="btn-outline justify-center">
            <FontAwesomeIcon icon={faArrowRotateRight} className={verificando ? "animate-spin" : ""} />
            {verificando ? "Verificando..." : "Já paguei, verificar"}
          </button>
          <Link href={whatsappLink(mensagemWhats)} target="_blank" className="btn-gold justify-center">
            <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
            Enviar comprovante
          </Link>
        </div>

        {aindaPendente && (
          <p className="mt-4 rounded-xl bg-sand p-3 text-center text-sm text-primary/75">
            Ainda não identificamos o pagamento. A confirmação é feita pela nossa
            equipe, então envie o comprovante pelo WhatsApp para agilizar.
          </p>
        )}

        {retirada && (
          <p className="mt-6 flex items-start gap-3 rounded-xl border border-cardBorder p-4 text-sm leading-relaxed text-primary/75">
            <FontAwesomeIcon icon={faStore} className="mt-0.5 text-terracotta" />
            <span>
              Retirada na loja: {LOJA.endereco}. Combinamos o horário pelo
              WhatsApp depois da confirmação do pagamento.
            </span>
          </p>
        )}

        <p className="mt-8 text-center text-sm text-primary/60">
          Você pode acompanhar o pedido em{" "}
          <Link href="/conta" className="font-medium text-terracotta underline">Minha conta</Link>.
        </p>
      </div>
    </div>
  );
}
