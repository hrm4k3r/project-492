"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabase";

const statusOptions = ["pendente", "pago", "preparando", "enviado", "entregue", "cancelado"];

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPedidos = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), profiles(full_name, phone), addresses(*)")
      .order("created_at", { ascending: false });
    setPedidos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  const updateStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    loadPedidos();
  };

  return (
    <div>
      <h1 className="section-title">Pedidos</h1>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : pedidos.length === 0 ? (
        <p className="mt-8 text-primary/60">Nenhum pedido recebido ainda.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="card-surface p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-medium text-primary">
                    {pedido.profiles?.full_name ?? "Cliente"} &middot;{" "}
                    <span className="text-primary/60">{pedido.profiles?.phone}</span>
                  </p>
                  <p className="text-xs text-primary/50">
                    {new Date(pedido.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <select
                  value={pedido.status}
                  onChange={(e) => updateStatus(pedido.id, e.target.value)}
                  className="w-fit rounded-full border border-cardBorder bg-white px-3 py-1.5 text-sm font-medium capitalize outline-none focus:border-gold"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {pedido.addresses ? (
                <p className="mt-3 text-sm text-primary/60">
                  Entregar em: {pedido.addresses.street}, {pedido.addresses.number} &mdash;{" "}
                  {pedido.addresses.neighborhood}, {pedido.addresses.city}/{pedido.addresses.state} &mdash;{" "}
                  CEP {pedido.addresses.cep}
                </p>
              ) : (
                <p className="mt-3 text-sm font-medium text-olive">
                  Retirada no local (sem entrega)
                </p>
              )}

              <ul className="mt-3 space-y-1 border-t border-cardBorder pt-3 text-sm text-primary/80">
                {pedido.order_items?.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.quantidade}x {item.titulo}</span>
                    <span>{Number(item.subtotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex justify-between border-t border-cardBorder pt-3 text-sm text-primary/70">
                <span>Frete: {Number(pedido.frete).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                {pedido.desconto > 0 && (
                  <span>Desconto: -{Number(pedido.desconto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                )}
                <span className="font-display text-lg text-terracotta">
                  Total: {Number(pedido.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
