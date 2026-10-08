"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../../../config/supabase";
import AddressForm from "../components/AddressForm";
import PagamentoStep from "../components/PagamentoStep";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashAlt, faMinus, faPlus, faTruckFast, faTag, faCartShopping, faPlus as faPlusIcon, faStore,
} from "@fortawesome/free-solid-svg-icons";

const RETIRADA_SERVICO = "Retirada no local";

const formatBRL = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useFreteReal(cep, itens) {
  const [opcoes, setOpcoes] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const cepLimpo = (cep || "").replace(/\D/g, "");
    if (cepLimpo.length !== 8 || itens.length === 0) {
      setOpcoes([]);
      setSelecionada(null);
      return;
    }

    let cancelado = false;
    async function calcular() {
      setLoading(true);
      setAviso("");
      try {
        const res = await fetch("/api/frete/calcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cep: cepLimpo,
            itens: itens.map((i) => ({ id: i.id, quantidade: i.quantidade })),
          }),
        });
        const data = await res.json();
        if (cancelado) return;
        setOpcoes(data.opcoes ?? []);
        setSelecionada(data.opcoes?.[0] ?? null);
        if (data.aviso) setAviso(data.aviso);
      } catch {
        if (!cancelado) {
          setOpcoes([]);
          setSelecionada(null);
          setAviso("Não foi possível calcular o frete agora.");
        }
      }
      if (!cancelado) setLoading(false);
    }
    calcular();
    return () => { cancelado = true; };
  }, [cep, JSON.stringify(itens.map((i) => ({ id: i.id, quantidade: i.quantidade })))]);

  return { opcoes, selecionada, setSelecionada, loadingFrete: loading, aviso };
}

export default function Carrinho() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart();

  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState("entrega");

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [finalizando, setFinalizando] = useState(false);
  const [pedidoCriado, setPedidoCriado] = useState(null);
  const [erro, setErro] = useState("");

  const cepAtivo = tipoEntrega === "retirada" ? "" : selectedAddress?.cep || cep;
  const { opcoes, selecionada, setSelecionada, loadingFrete, aviso } = useFreteReal(cepAtivo, items);

  useEffect(() => {
    async function loadAddresses() {
      if (!user) return;
      const { data } = await supabase.from("addresses").select("*").eq("profile_id", user.id);
      setAddresses(data ?? []);
      if (data?.length) setSelectedAddress(data.find((a) => a.is_default) ?? data[0]);
    }
    loadAddresses();
  }, [user]);

  const handleCepBlur = async () => {
    // o próprio hook de frete já dispara com o CEP digitado
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setCheckingCoupon(true);
    const { data, error } = await supabase.rpc("validate_coupon", {
      coupon_code: coupon.trim(),
      order_subtotal: subtotal,
    });
    setCheckingCoupon(false);
    if (error || !data?.[0]) {
      setCouponResult({ valid: false, message: "Erro ao validar cupom." });
      return;
    }
    setCouponResult(data[0]);
  };

  const desconto = couponResult?.valid
    ? couponResult.discount_type === "percent"
      ? (subtotal * Number(couponResult.discount_value)) / 100
      : Number(couponResult.discount_value)
    : 0;

  const freteGratisPorValor = subtotal >= 1000;
  const freteValor = tipoEntrega === "retirada" ? 0 : freteGratisPorValor ? 0 : (selecionada?.preco ?? 0);
  const total = Math.max(0, subtotal - desconto) + freteValor;

  const handleFinalizar = async () => {
    setErro("");

    if (!user) {
      router.push("/entrar");
      return;
    }
    if (tipoEntrega === "entrega") {
      if (!selectedAddress) {
        setErro("Selecione ou cadastre um endereço de entrega.");
        return;
      }
      if (!selecionada && !freteGratisPorValor) {
        setErro("Não foi possível calcular o frete para esse endereço.");
        return;
      }
    }

    setFinalizando(true);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        profile_id: user.id,
        address_id: tipoEntrega === "retirada" ? null : selectedAddress.id,
        status: "pendente",
        subtotal,
        frete: freteValor,
        frete_servico: tipoEntrega === "retirada" ? RETIRADA_SERVICO : selecionada?.servico ?? null,
        desconto,
        total,
        coupon_code: couponResult?.valid ? coupon.trim().toUpperCase() : null,
      })
      .select()
      .single();

    if (orderError) {
      setErro("Não foi possível registrar o pedido: " + orderError.message);
      setFinalizando(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      produto_id: item.id,
      titulo: item.titulo,
      preco_unitario: item.preco,
      quantidade: item.quantidade,
      subtotal: item.preco * item.quantidade,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      setErro("Pedido criado, mas houve um erro ao salvar os itens: " + itemsError.message);
      setFinalizando(false);
      return;
    }

    setPedidoCriado(order);
    clearCart();
    setFinalizando(false);
  };

  if (pedidoCriado) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-light px-5 py-16">
        <div className="card-surface w-full max-w-lg p-8">
          <PagamentoStep order={pedidoCriado} />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-light px-5 py-16 text-center">
        <FontAwesomeIcon icon={faCartShopping} className="text-4xl text-primary/30" />
        <h1 className="font-display text-2xl text-primary">Seu carrinho está vazio</h1>
        <Link href="/#produtos" className="btn-primary">Ver produtos</Link>
      </div>
    );
  }

  return (
    <div className="bg-light py-12 md:py-16">
      <div className="container-page grid grid-cols-1 gap-10 md:grid-cols-[1.6fr_1fr]">
        <div>
          <h1 className="section-title">Carrinho</h1>

          <div className="mt-6 flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="card-surface flex items-center gap-4 p-4">
                {item.foto && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream">
                    <Image src={item.foto} alt={item.titulo} fill sizes="64px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-display text-base text-primary">{item.titulo}</p>
                  <p className="text-sm text-terracotta">{formatBRL(item.preco)}</p>
                </div>
                <div className="flex items-center gap-3 rounded-full border border-cardBorder px-3 py-1.5">
                  <button aria-label="Diminuir" onClick={() => updateQuantity(item.id, item.quantidade - 1)} className="text-primary/60 hover:text-terracotta">
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
                  <span className="w-5 text-center text-sm">{item.quantidade}</span>
                  <button aria-label="Aumentar" onClick={() => updateQuantity(item.id, item.quantidade + 1)} className="text-primary/60 hover:text-terracotta">
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
                <p className="w-20 text-right font-semibold text-primary">{formatBRL(item.preco * item.quantidade)}</p>
                <button aria-label="Remover" onClick={() => removeItem(item.id)} className="text-primary/40 hover:text-terracotta">
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-lg text-primary">
              <FontAwesomeIcon icon={faTruckFast} className="text-terracotta" />
              Entrega
            </h2>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTipoEntrega("entrega")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  tipoEntrega === "entrega"
                    ? "border-gold bg-gold/10 text-primary"
                    : "border-cardBorder text-primary/60"
                }`}
              >
                <FontAwesomeIcon icon={faTruckFast} className="mr-2" />
                Receber em casa
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrega("retirada")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  tipoEntrega === "retirada"
                    ? "border-gold bg-gold/10 text-primary"
                    : "border-cardBorder text-primary/60"
                }`}
              >
                <FontAwesomeIcon icon={faStore} className="mr-2" />
                Retirar na loja
              </button>
            </div>

            {tipoEntrega === "retirada" ? (
              <p className="mt-3 text-sm text-primary/60">
                Sem custo de frete. Retire seu pedido diretamente na Fazenda Santo Antônio,
                em Alagoa/MG. Combinamos o horário pelo WhatsApp depois que o pagamento for confirmado.
              </p>
            ) : !user ? (
              <p className="mt-3 text-sm text-primary/60">
                Digite seu CEP para estimar o frete. Para finalizar a compra, você
                vai precisar <Link href="/entrar" className="font-semibold text-terracotta">entrar ou criar uma conta</Link>.
              </p>
            ) : addresses.length > 0 && !showAddressForm ? (
              <div className="mt-3 flex flex-col gap-2">
                {addresses.map((addr) => (
                  <label key={addr.id} className="card-surface flex items-center gap-3 p-3 text-sm">
                    <input
                      type="radio"
                      checked={selectedAddress?.id === addr.id}
                      onChange={() => setSelectedAddress(addr)}
                    />
                    <span>{addr.street}, {addr.number} &mdash; {addr.neighborhood}, {addr.city}/{addr.state} &mdash; CEP {addr.cep}</span>
                  </label>
                ))}
                <button onClick={() => setShowAddressForm(true)} className="btn-outline mt-1 self-start text-xs">
                  <FontAwesomeIcon icon={faPlusIcon} />
                  Novo endereço
                </button>
              </div>
            ) : user ? (
              <div className="mt-3 card-surface p-4">
                <AddressForm
                  profileId={user.id}
                  onSaved={(novo) => {
                    setAddresses((a) => [...a, novo]);
                    setSelectedAddress(novo);
                    setShowAddressForm(false);
                  }}
                />
              </div>
            ) : null}

            {tipoEntrega === "entrega" && !user && (
              <div className="mt-3 flex max-w-xs gap-2">
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="Digite seu CEP"
                  className="w-full rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
            )}

            {tipoEntrega === "entrega" && loadingFrete && <p className="mt-2 text-xs text-primary/50">Calculando frete...</p>}

            {tipoEntrega === "entrega" && !loadingFrete && opcoes.length > 0 && !freteGratisPorValor && (
              <div className="mt-3 flex flex-col gap-2">
                {opcoes.map((op) => (
                  <label key={op.servico} className="card-surface flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selecionada?.servico === op.servico}
                        onChange={() => setSelecionada(op)}
                      />
                      {op.servico} &middot; {op.prazoDias} dia{op.prazoDias > 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold text-terracotta">{formatBRL(op.preco)}</span>
                  </label>
                ))}
              </div>
            )}

            {tipoEntrega === "entrega" && aviso && <p className="mt-2 text-xs text-primary/50">{aviso}</p>}
          </div>
        </div>

        <div className="card-surface flex flex-col gap-4 p-6">
          <h2 className="font-display text-lg text-primary">Resumo</h2>

          <div className="flex justify-between text-sm text-primary/70">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm text-primary/70">
            <span>Frete {tipoEntrega === "entrega" && selecionada?.servico ? `(${selecionada.servico})` : ""}</span>
            <span>
              {tipoEntrega === "retirada"
                ? "Retirada no local"
                : freteGratisPorValor
                ? "Grátis"
                : loadingFrete
                ? "Calculando..."
                : selecionada
                ? formatBRL(freteValor)
                : "Informe o CEP"}
            </span>
          </div>

          {desconto > 0 && (
            <div className="flex justify-between text-sm text-olive">
              <span>Desconto ({coupon.toUpperCase()})</span>
              <span>-{formatBRL(desconto)}</span>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <FontAwesomeIcon icon={faTag} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Cupom de desconto"
                className="w-full rounded-lg border border-cardBorder bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gold"
              />
            </div>
            <button onClick={handleApplyCoupon} disabled={checkingCoupon} className="btn-outline px-4 text-xs">
              {checkingCoupon ? "..." : "Aplicar"}
            </button>
          </div>
          {couponResult && (
            <p className={`text-xs ${couponResult.valid ? "text-olive" : "text-terracotta"}`}>{couponResult.message}</p>
          )}

          <div className="flex justify-between border-t border-cardBorder pt-4 font-display text-xl text-primary">
            <span>Total</span>
            <span className="text-terracotta">{formatBRL(total)}</span>
          </div>

          {erro && <p className="text-sm text-terracotta">{erro}</p>}

          <button onClick={handleFinalizar} disabled={finalizando || authLoading} className="btn-primary justify-center disabled:opacity-60">
            {finalizando ? "Enviando..." : user ? "Finalizar Compra" : "Entrar para finalizar"}
          </button>
        </div>
      </div>
    </div>
  );
}
