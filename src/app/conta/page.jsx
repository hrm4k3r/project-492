"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faPlus,
  faLocationDot,
  faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import AddressForm from "../components/AddressForm";

const statusLabel = {
  pendente: "Pendente",
  pago: "Pago",
  preparando: "Preparando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function Conta() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/entrar");
    }
  }, [loading, user, router]);

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

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-light">
        <p className="text-primary/60">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="bg-light py-16">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="eyebrow">Minha conta</span>
            <h1 className="section-title mt-1">{profile?.full_name || user.email}</h1>
            <p className="mt-1 text-sm text-primary/60">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.role === "admin" && (
              <Link href="/admin" className="btn-outline text-sm">Painel admin</Link>
            )}
            <button onClick={signOut} className="flex items-center gap-2 text-sm font-medium text-primary/60 hover:text-terracotta">
              <FontAwesomeIcon icon={faRightFromBracket} />
              Sair
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl text-primary">
              <FontAwesomeIcon icon={faBoxOpen} className="text-terracotta" />
              Meus pedidos
            </h2>

            {dataLoading ? (
              <p className="mt-4 text-primary/60">Carregando pedidos...</p>
            ) : orders.length === 0 ? (
              <p className="mt-4 text-primary/60">Você ainda não fez nenhum pedido.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {orders.map((order) => (
                  <div key={order.id} className="card-surface p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-primary/60">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-primary/80">
                      {order.order_items?.map((item) => (
                        <li key={item.id}>
                          {item.quantidade}x {item.titulo}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 font-display text-lg text-terracotta">
                      {Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="flex items-center gap-2 font-display text-xl text-primary">
              <FontAwesomeIcon icon={faLocationDot} className="text-terracotta" />
              Endereços
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="card-surface p-4 text-sm text-primary/80">
                  <p className="font-medium text-primary">{addr.street}, {addr.number}</p>
                  <p>{addr.neighborhood} &mdash; {addr.city}/{addr.state}</p>
                  <p>CEP {addr.cep}</p>
                </div>
              ))}
            </div>

            {showAddressForm ? (
              <div className="mt-4 card-surface p-4">
                <AddressForm
                  profileId={user.id}
                  onSaved={() => {
                    setShowAddressForm(false);
                    supabase.from("addresses").select("*").eq("profile_id", user.id).then(({ data }) => setAddresses(data ?? []));
                  }}
                />
              </div>
            ) : (
              <button onClick={() => setShowAddressForm(true)} className="btn-outline mt-4 text-sm">
                <FontAwesomeIcon icon={faPlus} />
                Adicionar endereço
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
