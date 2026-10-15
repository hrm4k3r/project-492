"use client";
import { useState } from "react";
import Image from "next/image";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy, faSpinner, faCreditCard, faQrcode } from "@fortawesome/free-solid-svg-icons";

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY, { locale: "pt-BR" });

function TabBtn({ ativa, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
        ativa
          ? "border-primary bg-primary text-cream"
          : "border-cardBorder bg-white text-primary hover:border-gold"
      }`}
    >
      <FontAwesomeIcon icon={icon} />
      {children}
    </button>
  );
}

function PixSection({ orderId, onPago }) {
  const [pixData, setPixData] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  const gerarPix = async () => {
    setGerando(true);
    setErro("");
    try {
      const res = await fetch("/api/pagamento/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          selectedPaymentMethod: "bank_transfer",
          formData: { payment_method_id: "pix", payer: { email: "" } },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar Pix");
      if (!data.pixQrCode) throw new Error("QR Code não retornado pelo servidor");
      setPixData(data);
    } catch (err) {
      setErro(err.message);
    }
    setGerando(false);
  };

  const copiar = () => {
    navigator.clipboard.writeText(pixData.pixQrCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  if (pixData) {
    return (
      <div className="rounded-2xl border border-cardBorder bg-white p-6 text-center">
        <p className="font-display text-xl font-semibold text-primary">QR Code Pix gerado</p>
        <p className="mt-1 text-sm text-primary/65">
          Escaneie com o app do seu banco ou copie o código
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
          <button onClick={copiar} className="btn-primary shrink-0 !py-2.5 text-xs">
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
    <div className="rounded-2xl border border-cardBorder bg-white p-8 text-center">
      <p className="text-sm text-primary/65">
        Clique para gerar o QR Code Pix. O código é válido por 30 minutos.
      </p>
      {erro && <p className="mt-3 text-sm text-terracotta">{erro}</p>}
      <button
        onClick={gerarPix}
        disabled={gerando}
        className="btn-primary mx-auto mt-5 !py-3 disabled:opacity-60"
      >
        <FontAwesomeIcon icon={gerando ? faSpinner : faQrcode} className={gerando ? "animate-spin" : ""} />
        {gerando ? "Gerando..." : "Gerar QR Code Pix"}
      </button>
    </div>
  );
}

export default function PagamentoBrick({ orderId, total, onPago, onProcessando }) {
  const [modo, setModo] = useState("pix");
  const [aprovado, setAprovado] = useState(false);
  const [brickReady, setBrickReady] = useState(false);

  const onSubmitCartao = ({ selectedPaymentMethod, formData }) =>
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
          if (data.status === "approved") {
            setAprovado(true);
            onPago?.();
            resolve();
            return;
          }
          if (data.status === "in_process" || data.status === "pending") {
            // Anti-fraude em análise — polling vai confirmar via webhook
            onProcessando?.();
            resolve();
            return;
          }
          reject(new Error("Pagamento recusado. Verifique os dados ou tente outro cartão."));
        })
        .catch((err) => reject(err));
    });

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <TabBtn ativa={modo === "pix"} onClick={() => setModo("pix")} icon={faQrcode}>
          Pix
        </TabBtn>
        <TabBtn ativa={modo === "card"} onClick={() => setModo("card")} icon={faCreditCard}>
          Cartão
        </TabBtn>
      </div>

      {modo === "pix" && <PixSection orderId={orderId} onPago={onPago} />}

      {modo === "card" && (
        <div>
          {!brickReady && (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-cardBorder">
              <p className="text-sm text-primary/50">Carregando formulário...</p>
            </div>
          )}
          <Payment
            initialization={{ amount: total }}
            customization={{
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                maxInstallments: 12,
              },
            }}
            onSubmit={onSubmitCartao}
            onReady={() => setBrickReady(true)}
            onError={(err) => console.error("MP Brick error:", err)}
          />
        </div>
      )}
    </div>
  );
}
