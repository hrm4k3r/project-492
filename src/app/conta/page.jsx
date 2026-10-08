"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../../config/supabase";
import { formatBRL } from "../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket, faPlus, faLocationDot, faBoxOpen, faTrashCan, faStore, faQrcode, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import AddressForm from "../components/AddressForm";
import PagamentoStep from "../components/PagamentoStep";

const statusInfo = {
  pendente: { label: "Aguardando pagamento", classe: "bg-gold/25 text-terracotta" },
  pago: { label: "Pago", classe: "bg-olive/20 text-olive" },
  preparando: { label: "Preparando", classe: "bg-gold/25 text-primary" },
  enviado: { label: "Enviado", classe: "bg-brand/15 text-brand" },
  entregue: { label: "Entregue", classe: "bg-olive/20 text-olive" },
  cancelado: { label: "Cancelado", classe: "bg-primary/10 text-primary/55" },
};

const etapas = ["pago", "preparando", "enviado", "entregue"];

function Acompanhamento({ status, retirada }) {
  const indice = etapas.indexOf(status);
  if (indice < 0) return null;
  const nomes = retirada ? ["Pago", "Preparando", "Pronto p/ retirada", "Retirado"] : ["Pago", "Preparando", "Enviado", "Entregue"];
  return (
    <ol className="mt-4 grid grid-cols-4 gap-2 text-center">
      {nomes.map((nome, i) => (
        <li key={nome}>
          <div className={`h-1.5 rounded-full ${i <= indice ? "bg-gold" : "bg-cardBorder"}`} />
          <span className={`mt-1.5 block text-[10px] uppercase tracking-wide ${i <= indice ? "text-primary" : "text-primary/40"}`}>
            {nome}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function Conta() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [pagandoId, setPagandoId] = useState(null);
  const [erroEndereco, setErroEndereco] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/entrar?voltar=/conta");
    }
  }, [loading, user, router]);

  const carregarEnderecos = async () => {
    const { data } = await supabase.from("addresses").select("*").eq("profile_id", user.id);
    setAddresses(data ?? []);
  };

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [ordersRes, addressesRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").eq("profile_id", user.id).order("created_at", { ascending: false }),
        supabase.from("addresses").select("*").eq("profile_id", user.id),
      ]);
      setOrders(ordersRes.data ?? []);
      setAddresses(addressesRes.data ?? []);
      setDataLoading(false);
    }
    loadData();
  }, [user]);

  const removerEndereco = async (id) => {
    if (!confirm("Remover este endereço?")) return;
    setErroEndereco("");
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) {
      setErroEndereco(
        error.code === "23503"
          ? "Esse endereço foi usado em um pedido e não pode ser removido."
          : "Não foi possível remover o endereço."
      );
      return;
    }
    carregarEnderecos();
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-light">
        <p className="text-primary/60">Carregando...</p>
      </div>
    );
  }

  const primeiroNome = (profile?.full_name || "").split(" ")[0];

  return (
    <div className="bg-light">
      <section className="bg-brand text-cream">
        <div className="container-page flex flex-col items-start justify-between gap-5 py-10 md:flex-row md:items-center md:py-12">
          <div>
            <span className="eyebrow text-gold">Minha conta</span>
            <h1 className="mt-3 font-display text-4xl font-medium md:text-5xl">
              Olá{primeiroNome ? `, ${primeiroNome}` : ""}
            </h1>
            <p className="mt-1 text-sm text-cream/65">{user.email}</p>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === "admin" && (
              <Link href="/admin" className="btn-ghost-cream !py-2.5 text-xs">Painel admin</Link>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-cream/75 transition-colors hover:text-gold"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Sair
            </button>
          </div>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-10 py-10 lg:grid-cols-[1.5fr_1fr] lg:py-14">
        <section>
          <h2 className="flex items-center gap-3 font-display text-3xl font-semibold text-primary">
            <FontAwesomeIcon icon={faBoxOpen} className="text-xl text-terracotta" />
            Meus pedidos
          </h2>

          {dataLoading ? (
            <p className="mt-6 text-primary/60">Carregando pedidos...</p>
          ) : orders.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cardBorder bg-white px-6 py-14 text-center">
              <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="h-12 w-auto opacity-70" />
              <p className="mt-4 font-display text-2xl text-primary">Você ainda não fez nenhum pedido</p>
              <p className="mt-1 text-sm text-primary/60">Que tal descobrir um novo rótulo para a sua mesa?</p>
              <Link href="/produtos" className="btn-primary mt-6">Ver o catálogo</Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              {orders.map((order) => {
                const info = statusInfo[order.status] ?? { label: order.status, classe: "bg-primary/10 text-primary" };
                const retirada = order.frete_servico === "Retirada no local";
                const endereco = addresses.find((a) => a.id === order.address_id);
                return (
                  <div key={order.id} className="card-surface p-5 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-xl font-semibold text-primary">
                          Pedido #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-primary/55">
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${info.classe}`}>
                        {info.label}
                      </span>
                    </div>

                    <Acompanhamento status={order.status} retirada={retirada} />

                    <ul className="mt-5 space-y-1.5 border-t border-cardBorder pt-4 text-sm text-primary/80">
                      {order.order_items?.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4">
                          <span>{item.quantidade}x {item.titulo}</span>
                          <span className="text-primary/55">{formatBRL(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-4 flex items-start gap-2 text-sm text-primary/65">
                      <FontAwesomeIcon icon={retirada ? faStore : faLocationDot} className="mt-0.5 text-terracotta" />
                      {retirada
                        ? "Retirada na loja"
                        : endereco
                        ? `${endereco.street}, ${endereco.number} - ${endereco.city}/${endereco.state}`
                        : "Entrega"}
                      {!retirada && order.frete_servico ? ` · ${order.frete_servico}` : ""}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cardBorder pt-4">
                      <p className="font-display text-2xl font-semibold text-terracotta">{formatBRL(order.total)}</p>
                      {order.status === "pendente" && (
                        <button
                          onClick={() => setPagandoId(pagandoId === order.id ? null : order.id)}
                          className="btn-primary !py-2.5 text-xs"
                        >
                          <FontAwesomeIcon icon={pagandoId === order.id ? faXmark : faQrcode} />
                          {pagandoId === order.id ? "Fechar" : "Pagar com Pix"}
                        </button>
                      )}
                    </div>

                    {pagandoId === order.id && (
                      <div className="mt-5">
                        <PagamentoStep order={order} nivelTitulo="h2" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside>
          <h2 className="flex items-center gap-3 font-display text-3xl font-semibold text-primary">
            <FontAwesomeIcon icon={faLocationDot} className="text-xl text-terracotta" />
            Endereços
          </h2>

          <div className="mt-6 flex flex-col gap-3">
            {addresses.length === 0 && !showAddressForm && (
              <p className="text-sm text-primary/60">Você ainda não cadastrou nenhum endereço.</p>
            )}
            {addresses.map((addr) => (
              <div key={addr.id} className="card-surface flex items-start justify-between gap-3 p-4 text-sm text-primary/75">
                <div>
                  <p className="font-medium text-primary">
                    {addr.street}, {addr.number}
                    {addr.complement ? ` - ${addr.complement}` : ""}
                  </p>
                  <p>{addr.neighborhood} &mdash; {addr.city}/{addr.state}</p>
                  <p>CEP {addr.cep}</p>
                </div>
                <button
                  onClick={() => removerEndereco(addr.id)}
                  aria-label="Remover endereço"
                  className="text-primary/35 transition-colors hover:text-terracotta"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            ))}
            {erroEndereco && <p className="text-sm text-terracotta">{erroEndereco}</p>}
          </div>

          {showAddressForm ? (
            <div className="card-surface mt-4 p-4">
              <AddressForm
                profileId={user.id}
                onSaved={() => {
                  setShowAddressForm(false);
                  carregarEnderecos();
                }}
              />
              <button onClick={() => setShowAddressForm(false)} className="mt-3 text-xs text-primary/60 underline">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddressForm(true)} className="btn-outline mt-4 text-xs">
              <FontAwesomeIcon icon={faPlus} />
              Adicionar endereço
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
