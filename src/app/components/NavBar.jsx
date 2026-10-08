"use client";
import Image from "next/image";
import logo from "../../../public/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faTruck,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import NavMobile from "./NavMobile";
import {
  faFacebook,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const CustomLink = ({ title, link }) => {
  return (
    <Link
      href={link}
      className="font-sans text-sm font-medium tracking-wide text-cream/90 transition-colors duration-300 hover:text-gold"
    >
      {title}
    </Link>
  );
};

export default function NavBar() {
  const { user, profile } = useAuth();
  const { totalItens } = useCart();

  return (
    <div className="sticky top-0 z-30">
      {/* Barra utilitária */}
      <div className="hidden items-center justify-between bg-primary px-6 py-2 text-cream md:flex">
        <p className="flex items-center gap-2 font-sans text-xs tracking-wide text-cream/80">
          <FontAwesomeIcon icon={faTruck} className="text-gold" />
          Frete grátis para compras acima de R$ 1.000,00 &middot; Atendemos
          também ao varejo, consulte-nos
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="https://www.instagram.com/queijofazendasantoantonio/"
            target="_blank"
            className="text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faInstagram} />
          </Link>
          <Link
            href="https://www.facebook.com/queijofazendasantoantonio"
            target="_blank"
            className="text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faFacebook} />
          </Link>
          <Link
            href="https://wa.me/+553598647172"
            target="_blank"
            className="text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faWhatsapp} />
          </Link>
        </div>
      </div>

      <NavMobile />

      {/* Nav principal */}
      <nav className="hidden w-full items-center justify-between border-b border-gold/30 bg-primary px-8 py-4 md:flex">
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0">
            <Image
              src={logo}
              width={64}
              height={64}
              alt="Queijo Fazenda Santo Antônio"
              className="rounded-full ring-2 ring-gold/60"
            />
          </Link>
          <div className="flex items-center gap-7">
            <CustomLink link="/" title="Início" />
            <CustomLink link="/#produtos" title="Produtos" />
            <CustomLink link="/rota" title="Rota do Queijo" />
            <CustomLink link="/quem-somos" title="Quem Somos" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <CustomLink link="/fale-conosco" title="Atendimento" />
          <Link
            href={user ? "/conta" : "/entrar"}
            className="flex items-center gap-2 text-sm font-medium text-cream/90 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faUser} />
            {user ? (profile?.full_name?.split(" ")[0] ?? "Minha Conta") : "Entrar"}
          </Link>
          <Link
            href="/carrinho"
            className="relative flex items-center gap-2 rounded-full border border-gold/50 px-4 py-2 text-sm font-medium text-cream transition-all duration-300 hover:bg-gold hover:text-primary"
          >
            <FontAwesomeIcon icon={faShoppingCart} />
            Carrinho
            {totalItens > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-xs font-bold text-cream">
                {totalItens}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </div>
  );
}
