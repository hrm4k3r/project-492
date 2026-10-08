"use client";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments,
  faCartShopping,
  faPeopleGroup,
  faLock,
  faHome,
  faCheese,
  faBars,
  faXmark,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebook,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import logo from "../../../public/logo.png";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const baseLinks = [
  { href: "/", label: "Início", icon: faHome },
  { href: "/#produtos", label: "Produtos", icon: faCheese },
  { href: "/rota", label: "Rota do Queijo", icon: faPeopleGroup },
  { href: "/quem-somos", label: "Quem Somos", icon: faPeopleGroup },
  { href: "/carrinho", label: "Carrinho", icon: faCartShopping },
  { href: "/fale-conosco", label: "Atendimento", icon: faComments },
  { href: "/politica-de-privacidade", label: "Política de Privacidade", icon: faLock },
  { href: "/politica-de-troca-e-devolucao", label: "Trocas e Devoluções", icon: faLock },
];

export default function NavMobile() {
  const [showSidebar, setShowSidebar] = useState(false);
  const { user } = useAuth();
  const { totalItens } = useCart();
  const links = [
    { href: user ? "/conta" : "/entrar", label: user ? "Minha Conta" : "Entrar", icon: faUser },
    ...baseLinks,
  ];

  return (
    <div className="flex justify-around bg-primary md:hidden">
      <div className="flex w-screen items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={logo}
            alt="Queijo Fazenda Santo Antônio"
            className="w-14 rounded-full ring-2 ring-gold/60"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/carrinho" className="relative text-gold">
            <FontAwesomeIcon icon={faCartShopping} className="text-2xl" />
            {totalItens > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-cream">
                {totalItens}
              </span>
            )}
          </Link>
          <button
            aria-label="Abrir menu"
            onClick={() => setShowSidebar(!showSidebar)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gold"
          >
            <FontAwesomeIcon icon={faBars} className="text-2xl" />
          </button>
        </div>
      </div>

      {showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-primary/60 backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[78vw] max-w-xs flex-col bg-primary text-cream shadow-2xl transition-transform duration-500 ease-in-out ${
          showSidebar ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          className="flex items-center justify-end p-6 text-xl text-gold"
          onClick={() => setShowSidebar(false)}
          aria-label="Fechar menu"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-cream/90 transition-colors duration-300 hover:bg-gold/10 hover:text-gold"
              onClick={() => setShowSidebar(false)}
            >
              <FontAwesomeIcon icon={link.icon} className="w-5 text-gold" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-center gap-6 border-t border-gold/20 p-6 text-lg text-gold">
          <Link href="https://www.instagram.com/queijofazendasantoantonio/" target="_blank">
            <FontAwesomeIcon icon={faInstagram} />
          </Link>
          <Link href="https://www.facebook.com/queijofazendasantoantonio" target="_blank">
            <FontAwesomeIcon icon={faFacebook} />
          </Link>
          <Link href="https://wa.me/+553598647172" target="_blank">
            <FontAwesomeIcon icon={faWhatsapp} />
          </Link>
        </div>
      </div>
    </div>
  );
}
