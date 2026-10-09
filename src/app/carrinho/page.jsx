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
import { LOJA, formatBRL } from "../../lib/loja";
import { useConfiguracoes } from "../../lib/useConfiguracoes";
import { semOtimizar } from "../../lib/imagem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashCan, faMinus, faPlus, faTruckFast, faTag, faStore, faCheck, faLock,
} from "@fortawesome/free-solid-svg-icons";

const RETIRADA_SERVICO = "Retirada no local";

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
  const { freteGratisAcima, primeiraCompraPercent } = useConfiguracoes();

  const [cep, setCep] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState("entrega");

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [percentPrimeiraCompra, setPercentPrimeiraCompra] = useState(0);
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

  useEffect(() => {
    async function carregarPrimeiraCompra() {
      if (!user) {
        setPercentPrimeiraCompra(0);
        return;
      }
      const { data } = await supabase.rpc("desconto_primeira_compra");
      setPercentPrimeiraCompra(Number(data) || 0);
    }
    carregarPrimeiraCompra();
  }, [user]);

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

  const descontoCupom = couponResult?.valid
    ? couponResult.discount_type === "percent"
      ? (subtotal * Number(couponResult.discount_value)) / 100
      : Number(couponResult.discount_value)
    : 0;
  const descontoPrimeiraCompra = (subtotal * percentPrimeiraCompra) / 100;
  const usaPrimeiraCompra = descontoPrimeiraCompra > descontoCupom;
  const desconto = Math.min(subtotal, Math.max(descontoCupom, descontoPrimeiraCompra));

  const freteGratisPorValor = freteGratisAcima > 0 && subtotal >= freteGratisAcima;
  const freteValor = tipoEntrega === "retirada" ? 0 : freteGratisPorValor ? 0 : (selecionada?.preco ?? 0);
  const total = Math.max(0, subtotal - desconto) + freteValor;

  const handleFinalizar = async () => {
    setErro("");

    if (!user) {
      router.push("/entrar?voltar=/carrinho");
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
        coupon_code: usaPrimeiraCompra
          ? "PRIMEIRA-COMPRA"
          : couponResult?.valid
          ? coupon.trim().toUpperCase()
          : null,
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
      <div className="bg-light px-5 py-12 md:py-16">
        <div className="mx-auto w-full max-w-2xl">
          <PagamentoStep order={pedidoCriado} />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-light px-5 py-16 text-center">
        <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="h-16 w-auto opacity-70" />
        <h1 className="font-display text-4xl font-medium text-primary">Seu carrinho está vazio</h1>
        <p className="max-w-sm text-primary/65">Que tal descobrir um novo rótulo para a sua mesa?</p>
        <Link href="/produtos" className="btn-primary mt-2">Ver o catálogo</Link>
      </div>
    );
  }

  const faltaFreteGratis = Math.max(0, freteGratisAcima - subtotal);
  const progressoFrete = freteGratisAcima > 0 ? Math.min(100, (subtotal / freteGratisAcima) * 100) : 0;

  const opcao = (ativa) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 ${
      ativa ? "border-primary bg-white shadow-card" : "border-cardBorder bg-white/60 hover:border-gold"
    }`;

  const passo = (n, texto, ativo) => (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
          ativo ? "border-gold bg-gold text-primary" : "border-cream/40 text-cream/70"
        }`}
      >
        {n}
      </span>
      <span className={ativo ? "text-cream" : "text-cream/60"}>{texto}</span>
    </li>
  );

  return (
    <div className="bg-light">
      <section className="bg-brand text-cream">
        <div className="container-page flex flex-col items-center gap-4 py-10 text-center md:py-12">
          <h1 className="font-display text-4xl font-medium md:text-5xl">Seu carrinho</h1>
          <ol className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] md:gap-5">
            {passo(1, "Carrinho", true)}
            <span className="h-px w-5 bg-cream/30 md:w-8" />
            {passo(2, "Entrega", false)}
            <span className="h-px w-5 bg-cream/30 md:w-8" />
            {passo(3, "Pix", false)}
          </ol>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-10 lg:py-14">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="card-surface flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
                <Link
                  href={`/detalhes?id=${item.id}`}
                  className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-sand"
                >
                  {item.foto && (
                    <Image src={item.foto} alt={item.titulo} fill sizes="80px" unoptimized={semOtimizar(item.foto)} className="object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 basis-40">
                  <Link href={`/detalhes?id=${item.id}`}>
                    <p className="font-display text-xl font-semibold leading-tight text-primary transition-colors hover:text-terracotta">
                      {item.titulo}
                    </p>
                  </Link>
                  <p className="mt-1 text-sm text-primary/60">{formatBRL(item.preco)} cada</p>
                </div>
                <div className="flex items-center gap-4 rounded-full border border-cardBorder px-4 py-2">
                  <button
                    aria-label="Diminuir"
                    onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                    className="text-primary/60 transition-colors hover:text-terracotta"
                  >
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
                  <span className="w-5 text-center text-sm font-medium">{item.quantidade}</span>
                  <button
                    aria-label="Aumentar"
                    onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                    className="text-primary/60 transition-colors hover:text-terracotta"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
                <p className="w-24 text-right font-display text-xl font-semibold text-terracotta">
                  {formatBRL(item.preco * item.quantidade)}
                </p>
                <button
                  aria-label={`Remover ${item.titulo}`}
                  onClick={() => removeItem(item.id)}
                  className="text-primary/40 transition-colors hover:text-terracotta"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            ))}
          </section>

          <section className="card-surface p-5 md:p-6">
            <h2 className="font-display text-2xl font-semibold text-primary">Como você quer receber?</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setTipoEntrega("entrega")} className={opcao(tipoEntrega === "entrega")}>
                <FontAwesomeIcon icon={faTruckFast} className="mt-1 text-lg text-terracotta" />
                <span>
                  <span className="block font-medium text-primary">Receber em casa</span>
                  <span className="block text-sm text-primary/60">Frete calculado pelo seu CEP</span>
                </span>
              </button>
              <button type="button" onClick={() => setTipoEntrega("retirada")} className={opcao(tipoEntrega === "retirada")}>
                <FontAwesomeIcon icon={faStore} className="mt-1 text-lg text-terracotta" />
                <span>
                  <span className="block font-medium text-primary">Retirar na loja</span>
                  <span className="block text-sm text-primary/60">Sem frete</span>
                </span>
              </button>
            </div>

            {tipoEntrega === "retirada" ? (
              <p className="mt-4 rounded-xl bg-sand p-4 text-sm leading-relaxed text-primary/75">
                Retire seu pedido na loja ({LOJA.endereco}). Combinamos o
                horário pelo WhatsApp depois que o pagamento for confirmado.
              </p>
            ) : (
              <div className="mt-5">
                {!user ? (
                  <>
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/55" htmlFor="cep">
                      Digite seu CEP para estimar o frete
                    </label>
                    <input
                      id="cep"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      className="mt-1.5 w-full max-w-xs rounded-lg border border-cardBorder bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"
                    />
                    <p className="mt-3 text-sm text-primary/60">
                      Para finalizar a compra, você vai precisar{" "}
                      <Link href="/entrar?voltar=/carrinho" className="font-medium text-terracotta underline">
                        entrar ou criar uma conta
                      </Link>
                      .
                    </p>
                  </>
                ) : addresses.length > 0 && !showAddressForm ? (
                  <div className="flex flex-col gap-3">
                    {addresses.map((addr) => (
                      <label key={addr.id} className={opcao(selectedAddress?.id === addr.id)}>
                        <input
                          type="radio"
                          name="endereco"
                          className="mt-1 accent-[#5A2A14]"
                          checked={selectedAddress?.id === addr.id}
                          onChange={() => setSelectedAddress(addr)}
                        />
                        <span className="text-sm text-primary/80">
                          <span className="block font-medium text-primary">
                            {addr.street}, {addr.number}
                            {addr.complement ? ` - ${addr.complement}` : ""}
                          </span>
                          {addr.neighborhood}, {addr.city}/{addr.state} &middot; CEP {addr.cep}
                        </span>
                      </label>
                    ))}
                    <button onClick={() => setShowAddressForm(true)} className="btn-outline self-start text-xs">
                      <FontAwesomeIcon icon={faPlus} />
                      Novo endereço
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-cardBorder bg-light p-4">
                    <AddressForm
                      profileId={user.id}
                      onSaved={(novo) => {
                        setAddresses((a) => [...a, novo]);
                        setSelectedAddress(novo);
                        setShowAddressForm(false);
                      }}
                    />
                    {addresses.length > 0 && (
                      <button onClick={() => setShowAddressForm(false)} className="mt-3 text-xs text-primary/60 underline">
                        Cancelar
                      </button>
                    )}
                  </div>
                )}

                {loadingFrete && <p className="mt-4 text-sm text-primary/55">Calculando frete...</p>}

                {!loadingFrete && opcoes.length > 0 && !freteGratisPorValor && (
                  <div className="mt-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/55">Opções de envio</p>
                    <div className="mt-2 flex flex-col gap-3">
                      {opcoes.map((op) => (
                        <label
                          key={op.servico}
                          className={`${opcao(selecionada?.servico === op.servico)} items-center justify-between`}
                        >
                          <span className="flex items-center gap-3 text-sm">
                            <input
                              type="radio"
                              name="frete"
                              className="accent-[#5A2A14]"
                              checked={selecionada?.servico === op.servico}
                              onChange={() => setSelecionada(op)}
                            />
                            <span>
                              <span className="block font-medium text-primary">{op.servico}</span>
                              <span className="text-primary/60">
                                {op.prazoDias} dia{op.prazoDias > 1 ? "s" : ""} para entrega
                              </span>
                            </span>
                          </span>
                          <span className="font-display text-lg font-semibold text-terracotta">{formatBRL(op.preco)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {aviso && <p className="mt-3 text-xs text-primary/55">{aviso}</p>}
              </div>
            )}
          </section>
        </div>

        <aside className="card-surface flex flex-col gap-4 p-6 lg:sticky lg:top-44">
          <h2 className="font-display text-2xl font-semibold text-primary">Resumo do pedido</h2>

          {tipoEntrega === "entrega" && freteGratisAcima > 0 && (
            <div className="rounded-xl bg-sand p-3.5">
              <p className="text-sm text-primary/80">
                {freteGratisPorValor ? (
                  <span className="flex items-center gap-2 font-medium text-olive">
                    <FontAwesomeIcon icon={faCheck} />
                    Você ganhou frete grátis!
                  </span>
                ) : (
                  <>
                    Faltam <strong>{formatBRL(faltaFreteGratis)}</strong> para ganhar frete grátis.
                  </>
                )}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{ width: `${progressoFrete}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between text-sm text-primary/70">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm text-primary/70">
            <span>Frete {tipoEntrega === "entrega" && selecionada?.servico ? `(${selecionada.servico})` : ""}</span>
            <span>
              {tipoEntrega === "retirada"
                ? "Retirada na loja"
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
            <div className="flex justify-between text-sm font-medium text-olive">
              <span>
                {usaPrimeiraCompra
                  ? `Primeira compra (${percentPrimeiraCompra}%)`
                  : `Cupom ${coupon.toUpperCase()}`}
              </span>
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
                aria-label="Cupom de desconto"
                className="w-full rounded-lg border border-cardBorder bg-white py-2.5 pl-9 pr-3 text-sm uppercase outline-none placeholder:normal-case focus:border-gold"
              />
            </div>
            <button onClick={handleApplyCoupon} disabled={checkingCoupon} className="btn-outline px-5 !py-2.5 text-xs">
              {checkingCoupon ? "..." : "Aplicar"}
            </button>
          </div>
          {couponResult && (
            <p className={`text-xs ${couponResult.valid ? "text-olive" : "text-terracotta"}`}>{couponResult.message}</p>
          )}

          {!user && primeiraCompraPercent > 0 && (
            <p className="rounded-xl bg-sand p-3 text-xs text-primary/75">
              Primeira compra?{" "}
              <Link href="/cadastro?voltar=/carrinho" className="font-semibold text-terracotta underline">
                Crie sua conta
              </Link>{" "}
              e ganhe {primeiraCompraPercent}% de desconto.
            </p>
          )}

          <div className="flex items-baseline justify-between border-t border-cardBorder pt-4">
            <span className="font-display text-xl text-primary">Total</span>
            <span className="font-display text-3xl font-semibold text-terracotta">{formatBRL(total)}</span>
          </div>

          {erro && <p className="text-sm text-terracotta">{erro}</p>}

          <button
            onClick={handleFinalizar}
            disabled={finalizando || authLoading}
            className="btn-primary justify-center !py-4 disabled:opacity-60"
          >
            {finalizando ? "Enviando..." : user ? "Finalizar e pagar com Pix" : "Entrar para finalizar"}
          </button>

          <p className="flex items-center justify-center gap-2 text-center text-xs text-primary/55">
            <FontAwesomeIcon icon={faLock} />
            Pagamento por Pix, com QR Code gerado na hora.
          </p>
          <p className="text-center text-[11px] text-primary/45">
            Venda proibida para menores de 18 anos. Beba com moderação.
          </p>
        </aside>
      </div>
    </div>
  );
}
