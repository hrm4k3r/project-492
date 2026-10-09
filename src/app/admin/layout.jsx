"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGauge, faWineBottle, faBoxOpen, faTruck, faTags, faGear, faRightFromBracket, faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { href: "/admin", label: "Painel", icon: faGauge },
  { href: "/admin/pedidos", label: "Pedidos", icon: faBoxOpen, badge: true },
  { href: "/admin/produtos", label: "Produtos", icon: faWineBottle },
  { href: "/admin/cupons", label: "Cupons", icon: faTags },
  { href: "/admin/frete", label: "Frete", icon: faTruck },
  { href: "/admin/configuracoes", label: "Configurações", icon: faGear },
];

export default function AdminLayout({ children }) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/entrar?voltar=/admin");
    } else if (!isAdmin) {
      router.push("/");
    }
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .then(({ count }) => setPendentes(count ?? 0));
  }, [isAdmin, pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light">
        <p className="text-primary/60">{loading ? "Carregando..." : "Verificando acesso..."}</p>
      </div>
    );
  }

  const ativo = (href) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col bg-light md:flex-row">
      <aside className="flex flex-col gap-4 bg-brand p-4 text-cream md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:gap-6 md:p-6">
        <div className="flex items-center justify-between md:block">
          <Link href="/admin" aria-label="Painel da loja">
            <Image
              src="/logo-texto-creme.png"
              width={721}
              height={244}
              alt="Curadoria da Mesa"
              priority
              className="h-10 w-auto md:h-12"
            />
          </Link>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-gold md:mt-3">Painel da loja</p>
        </div>

        <nav className="no-scrollbar flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-medium uppercase tracking-[0.12em] transition-colors duration-300 ${
                ativo(item.href) ? "bg-gold text-primary" : "text-cream/80 hover:bg-cream/10"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4" />
              {item.label}
              {item.badge && pendentes > 0 && (
                <span
                  className={`ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                    ativo(item.href) ? "bg-primary text-cream" : "bg-terracotta text-cream"
                  }`}
                  title="Pedidos aguardando pagamento"
                >
                  {pendentes}
                </span>
              )}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-medium uppercase tracking-[0.12em] text-cream/70 hover:bg-cream/10 md:hidden"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4" />
            Sair
          </button>
        </nav>

        <div className="mt-auto hidden flex-col gap-1 border-t border-gold/20 pt-4 md:flex">
          <p className="truncate px-3 pb-2 text-xs text-cream/60">{profile?.full_name || user.email}</p>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium uppercase tracking-[0.12em] text-cream/70 hover:bg-cream/10"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-4" />
            Ver loja
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium uppercase tracking-[0.12em] text-cream/70 hover:bg-cream/10"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">{children}</main>
    </div>
  );
}
