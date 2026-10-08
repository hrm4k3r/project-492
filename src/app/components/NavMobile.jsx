"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { CATEGORIAS, LOJA, whatsappLink } from "../../lib/loja";

const itemClass =
  "rounded-lg px-3 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.16em] text-cream/90 transition-colors duration-300 hover:bg-gold/10 hover:text-gold";

export default function NavMobile() {
  const [showSidebar, setShowSidebar] = useState(false);
  const { user } = useAuth();
  const { totalItens } = useCart();
  const fechar = () => setShowSidebar(false);

  const principais = [
    { href: "/", label: "Início" },
    { href: "/produtos", label: "Catálogo" },
    { href: "/quem-somos", label: "Quem Somos" },
    { href: "/fale-conosco", label: "Atendimento" },
    { href: user ? "/conta" : "/entrar", label: user ? "Minha Conta" : "Entrar" },
  ];

  return (
    <div className="bg-brand md:hidden">
      <div className="flex items-center justify-between px-5 py-3">
        <Link href="/" aria-label={LOJA.nome} onClick={fechar}>
          <Image
            src="/logo-texto-creme.png"
            width={721}
            height={244}
            alt={LOJA.nome}
            priority
            className="h-11 w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/carrinho" aria-label="Carrinho" className="relative text-gold">
            <FontAwesomeIcon icon={faBagShopping} className="text-2xl" />
            {totalItens > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-cream">
                {totalItens}
              </span>
            )}
          </Link>
          <button
            aria-label="Abrir menu"
            onClick={() => setShowSidebar(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gold"
          >
            <FontAwesomeIcon icon={faBars} className="text-2xl" />
          </button>
        </div>
      </div>

      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-primary/70 backdrop-blur-sm" onClick={fechar} />
      )}

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[82vw] max-w-xs flex-col overflow-y-auto bg-brand text-cream shadow-2xl transition-transform duration-500 ease-in-out ${
          showSidebar ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          className="flex items-center justify-end p-6 text-xl text-gold"
          onClick={fechar}
          aria-label="Fechar menu"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <nav className="flex flex-col px-4">
          {principais.map((link) => (
            <Link key={link.label} href={link.href} className={itemClass} onClick={fechar}>
              {link.label}
            </Link>
          ))}

          <p className="mt-6 px-3 font-sans text-[11px] uppercase tracking-[0.28em] text-gold">
            Categorias
          </p>
          {CATEGORIAS.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              className={`${itemClass} !text-cream/75 normal-case tracking-wide`}
              onClick={fechar}
            >
              {c.nome}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-center gap-6 border-t border-gold/20 p-6 text-xl text-gold">
          <Link href={LOJA.instagram} target="_blank" aria-label="Instagram">
            <FontAwesomeIcon icon={faInstagram} />
          </Link>
          <Link href={whatsappLink()} target="_blank" aria-label="WhatsApp">
            <FontAwesomeIcon icon={faWhatsapp} />
          </Link>
        </div>
      </div>
    </div>
  );
}
