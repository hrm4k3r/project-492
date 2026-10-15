"use client";
import { useState } from "react";
import Image from "next/image";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY, { locale: "pt-BR" });

export default function PagamentoBrick({ orderId, total, onPago }) {
  const [pixData, setPixData] = useState(null);
  const [aprovado, setAprovado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [brickReady, setBrickReady] = useState(false);

  const onSubmit = ({ selectedPaymentMethod, formData }) =>
    new Promise((resolve, reject) => {
      fetch("/api/pagamento/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, selectedPaymentMethod, formData }),
      })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            reject(new Error(data.error ?? "Erro ao processar pagamento"));
            return;
          }
          if (data.pixQrCode) {
            setPixData(data);
            resolve();
            return;
          }
          if (["approved", "in_process", "pending"].includes(data.status)) {
            setAprovado(true);
            onPago?.();
            resolve();
            return;
          }
          reject(new Error("Pagamento recusado. Verifique os dados ou tente outro método."));
        })
        .catch((err) => reject(err));
    });

  const copiarPix = () => {
    navigator.clipboard.writeText(pixData.pixQrCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  if (aprovado) {
    return (
      <div className="rounded-2xl bg-olive/10 px-8 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive/20">
          <FontAwesomeIcon icon={faCheck} className="text-xl text-olive" />
        </div>
        <p className="mt-5 font-display text-2xl font-semibold text-primary">Pagamento recebido!</p>
        <p className="mt-2 text-sm text-primary/65">
          Seu pedido foi confirmado. Acompanhe em Minha conta.
        </p>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="rounded-2xl border border-cardBorder bg-white p-6 text-center">
        <p className="font-display text-2xl font-semibold text-primary">Pague com Pix</p>
        <p className="mt-1 text-sm text-primary/65">
          Escaneie o QR Code ou copie o código abaixo
        </p>
        <Image
          src={`data:image/png;base64,${pixData.pixQrCodeBase64}`}
          alt="QR Code Pix"
          width={208}
          height={208}
          unoptimized
          className="mx-auto mt-6 rounded-lg"
        />
        <div className="mt-5 flex gap-2">
          <input
            readOnly
            value={pixData.pixQrCode}
            className="min-w-0 flex-1 truncate rounded-lg border border-cardBorder bg-light px-3 py-2.5 text-xs text-primary/70 outline-none"
          />
          <button onClick={copiarPix} className="btn-primary shrink-0 !py-2.5 text-xs">
            <FontAwesomeIcon icon={copiado ? faCheck : faCopy} />
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="mt-5 text-xs text-primary/50">
          O pedido será confirmado automaticamente após o pagamento.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!brickReady && (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-cardBorder">
          <p className="text-sm text-primary/50">Carregando formulário de pagamento...</p>
        </div>
      )}
      <Payment
        initialization={{ amount: total }}
        customization={{
          paymentMethods: {
            bankTransfer: "all",
            creditCard: "all",
            debitCard: "all",
            maxInstallments: 12,
          },
        }}
        onSubmit={onSubmit}
        onReady={() => setBrickReady(true)}
        onError={(err) => console.error("MP Brick error:", err)}
      />
    </div>
  );
}
