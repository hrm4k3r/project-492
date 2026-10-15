"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../config/supabase";
import { useAuth } from "../../context/AuthContext";
import { formatBRL } from "../../../lib/loja";
import PagamentoBrick from "../../components/PagamentoBrick";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faCheck, faStore, faLocationDot } from "@fortawesome/free-solid-svg-icons";

export default function PaginaPagamento() {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pago, setPago] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [erroCartao, setErroCartao] = useState("");

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single()
      .then(({ data }) => {
        setOrder(data);
        if (data?.status === "pago") setPago(true);
        setLoading(false);
      });
  }, [orderId]);

  // Polling: verifica status no MP a cada 5s até confirmar ou o usuário sair da página
  useEffect(() => {
    if (!aguardandoConfirmacao || pago) return;
    const intervalo = setInterval(async () => {
      try {
        const res = await fetch("/api/pagamento/verificar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paymentId }),
        });
        const data = await res.json();
        if (data.status === "pago") {
          setPago(true);
          setAguardandoConfirmacao(false);
        } else if (data.status === "rejeitado") {
          setErroCartao("Pagamento recusado. Verifique os dados ou tente outro cartão.");
          setAguardandoConfirmacao(false);
        }
      } catch {
        // ignora erros de rede, tenta novamente
      }
    }, 5000);
    return () => clearInterval(intervalo);
  }, [aguardandoConfirmacao, pago, orderId, paymentId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-light">
        <p className="text-primary/60">Carregando...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-light">
        <p className="text-primary/60">Pedido não encontrado.</p>
      </div>
    );
  }

  if (pago) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-light px-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-olive/20">
          <FontAwesomeIcon icon={faCheck} className="text-2xl text-olive" />
        </div>
        <h1 className="font-display text-4xl font-medium text-primary">Pedido confirmado!</h1>
        <p className="max-w-sm text-primary/65">
          Pagamento recebido. Em breve você receberá a confirmação por e-mail.
        </p>
        <Link href="/conta" className="btn-primary mt-2">
          <FontAwesomeIcon icon={faBoxOpen} />
          Acompanhar pedido
        </Link>
      </div>
    );
  }

  const retirada = order.frete_servico === "Retirada no local";

  return (
    <div className="bg-light">
      <section className="bg-brand text-cream">
        <div className="container-page py-10 text-center md:py-12">
          <p className="eyebrow text-gold">Finalize sua compra</p>
          <h1 className="mt-3 font-display text-4xl font-medium md:text-5xl">Pagamento</h1>
          <p className="mt-2 text-sm text-cream/65">
            Pedido #{order.id.slice(0, 8).toUpperCase()} &middot; {formatBRL(order.total)}
          </p>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_22rem] lg:items-start lg:py-14">
        <div>
          <h2 className="font-display text-2xl font-semibold text-primary">Forma de pagamento</h2>
          <p className="mt-1 text-sm text-primary/60">
            Pague com cartão de crédito, débito ou Pix. Tudo seguro via Mercado Pago.
          </p>
          {erroCartao && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {erroCartao}{" "}
              <button className="underline" onClick={() => { setErroCartao(""); setAguardandoConfirmacao(false); }}>
                Tentar novamente
              </button>
            </div>
          )}
          <div className="mt-6">
            <PagamentoBrick
              orderId={orderId}
              total={order.total}
              onPago={() => { setPago(true); setAguardandoConfirmacao(false); }}
              onProcessando={(id) => { setPaymentId(id); setAguardandoConfirmacao(true); }}
            />
          </div>
        </div>

        <aside className="card-surface p-5 lg:sticky lg:top-10">
          <h2 className="font-display text-xl font-semibold text-primary">Resumo do pedido</h2>
          <ul className="mt-4 space-y-2 text-sm text-primary/75">
            {order.order_items?.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.quantidade}× {item.titulo}</span>
                <span className="shrink-0 text-primary/55">{formatBRL(item.subtotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-cardBorder pt-4 text-sm text-primary/70">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatBRL(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={retirada ? faStore : faLocationDot} className="text-terracotta" />
                {retirada ? "Retirada na loja" : order.frete_servico ?? "Frete"}
              </span>
              <span>{order.frete > 0 ? formatBRL(order.frete) : "Grátis"}</span>
            </div>
            {order.desconto > 0 && (
              <div className="flex justify-between font-medium text-olive">
                <span>Desconto</span>
                <span>-{formatBRL(order.desconto)}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-between border-t border-cardBorder pt-3">
            <span className="font-display text-lg text-primary">Total</span>
            <span className="font-display text-2xl font-semibold text-terracotta">
              {formatBRL(order.total)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
