"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheese, faBoxOpen, faCoins, faClock } from "@fortawesome/free-solid-svg-icons";

const StatCard = ({ icon, label, value, href }) => (
  <Link href={href} className="card-surface flex items-center gap-4 p-5 transition-shadow hover:shadow-card">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg text-gold">
      <FontAwesomeIcon icon={icon} />
    </span>
    <div>
      <p className="text-sm text-primary/60">{label}</p>
      <p className="font-display text-2xl text-primary">{value}</p>
    </div>
  </Link>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ produtos: 0, pedidosPendentes: 0, faturamento: 0, totalPedidos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [{ count: produtos }, { data: pedidos }] = await Promise.all([
        supabase.from("produtos").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("status, total"),
      ]);

      const pedidosPendentes = pedidos?.filter((p) => p.status === "pendente").length ?? 0;
      const faturamento = pedidos
        ?.filter((p) => p.status !== "cancelado")
        .reduce((sum, p) => sum + Number(p.total), 0) ?? 0;

      setStats({ produtos: produtos ?? 0, pedidosPendentes, faturamento, totalPedidos: pedidos?.length ?? 0 });
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div>
      <h1 className="section-title">Dashboard</h1>
      <p className="mt-2 text-primary/60">Visão geral da loja.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={faCheese} label="Produtos cadastrados" value={loading ? "..." : stats.produtos} href="/admin/produtos" />
        <StatCard icon={faClock} label="Pedidos pendentes" value={loading ? "..." : stats.pedidosPendentes} href="/admin/pedidos" />
        <StatCard icon={faBoxOpen} label="Total de pedidos" value={loading ? "..." : stats.totalPedidos} href="/admin/pedidos" />
        <StatCard
          icon={faCoins}
          label="Faturamento (não cancelados)"
          value={loading ? "..." : Number(stats.faturamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          href="/admin/pedidos"
        />
      </div>
    </div>
  );
}
