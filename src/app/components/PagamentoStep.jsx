"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { supabase } from "../../../config/supabase";
import { gerarPixCopiaECola } from "../../lib/pix";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy, faCheck, faArrowRotateRight, faCircleCheck, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

const formatBRL = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PIX_CHAVE = "62989928000106";
const PIX_NOME = "Queijo Fazenda Santo Antônio";
const PIX_CIDADE = "Alagoa";

function CopiarBotao({ texto }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      className="flex items-center gap-1.5 text-xs font-semibold text-terracotta"
    >
      <FontAwesomeIcon icon={copiado ? faCheck : faCopy} />
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function PagamentoStep({ order }) {
  const [statusAtual, setStatusAtual] = useState(order.status);
  const [copiaECola, setCopiaECola] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);

  const mensagemWhats = encodeURIComponent(
    `Olá! Fiz o pedido #${order.id.slice(0, 8)} no site (total ${formatBRL(order.total)}) e já vou pagar o Pix. Segue o comprovante:`
  );

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
        const qr = await QRCode.toDataURL(codigo, { margin: 1, width: 320 });
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

  const verificarPagamento = async () => {
    setVerificando(true);
    const { data } = await supabase.from("orders").select("status").eq("id", order.id).single();
    if (data) setStatusAtual(data.status);
    setVerificando(false);
  };

  if (statusAtual === "pago") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-olive" />
        <h2 className="font-display text-2xl text-primary">Pagamento confirmado!</h2>
        <p className="max-w-sm text-primary/70">
          Recebemos seu pagamento. Vamos preparar seu pedido com carinho.
        </p>
        <Link href="/conta" className="btn-primary">Ver meus pedidos</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-display text-2xl text-primary">Pedido #{order.id.slice(0, 8)} registrado!</h2>
      <p className="max-w-sm text-primary/70">
        Pague <strong>{formatBRL(order.total)}</strong> com Pix, escaneando o QR Code ou copiando o código abaixo no app do seu banco.
      </p>

      {erro && (
        <p className="flex items-center gap-2 text-sm text-terracotta">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {erro}
        </p>
      )}

      {qrCodeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrCodeUrl} alt="QR Code Pix" className="h-56 w-56 rounded-xl border border-cardBorder" />
      )}

      {copiaECola && (
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-lg border border-cardBorder bg-cream px-4 py-3">
          <span className="truncate text-xs text-primary/70">{copiaECola}</span>
          <CopiarBotao texto={copiaECola} />
        </div>
      )}

      <button onClick={verificarPagamento} disabled={verificando} className="btn-outline text-sm">
        <FontAwesomeIcon icon={faArrowRotateRight} className={verificando ? "animate-spin" : ""} />
        {verificando ? "Verificando..." : "Já paguei, verificar"}
      </button>

      <p className="text-xs text-primary/50">
        Assim que pagar, envie o comprovante pra gente confirmar mais rápido:{" "}
        <Link href={`https://wa.me/5535998647172?text=${mensagemWhats}`} target="_blank" className="font-semibold text-terracotta">
          Enviar comprovante no WhatsApp
        </Link>
      </p>
    </div>
  );
}
