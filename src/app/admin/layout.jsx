"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGauge,
  faCheese,
  faBoxOpen,
  faTruck,
  faTags,
  faRightFromBracket,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: faGauge },
  { href: "/admin/produtos", label: "Produtos", icon: faCheese },
  { href: "/admin/pedidos", label: "Pedidos", icon: faBoxOpen },
  { href: "/admin/frete", label: "Frete", icon: faTruck },
  { href: "/admin/cupons", label: "Cupons", icon: faTags },
];

export default function AdminLayout({ children }) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/entrar");
    } else if (!isAdmin) {
      router.push("/");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-light">
        <p className="text-primary/60">
          {loading ? "Carregando..." : "Verificando acesso..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col bg-light md:flex-row">
      <aside className="flex flex-col gap-1 border-b border-cardBorder bg-primary p-4 text-cream md:w-56 md:border-b-0 md:border-r md:p-6">
        <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-gold">
          {profile?.full_name || "Admin"}
        </p>
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-300 ${
                pathname === item.href
                  ? "bg-gold text-primary"
                  : "text-cream/85 hover:bg-cream/10"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-row gap-4 pt-4 md:flex-col md:gap-1">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-cream/70 hover:bg-cream/10">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4" />
            Ver site
          </Link>
          <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-cream/70 hover:bg-cream/10">
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
