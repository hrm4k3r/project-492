"use client";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faUser } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import NavMobile from "./NavMobile";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { CATEGORIAS, LOJA, whatsappLink, formatBRL } from "../../lib/loja";
import { useConfiguracoes } from "../../lib/useConfiguracoes";

const CustomLink = ({ title, link }) => (
  <Link
    href={link}
    className="font-sans text-[13px] font-medium uppercase tracking-[0.16em] text-cream/90 transition-colors duration-300 hover:text-gold"
  >
    {title}
  </Link>
);

export default function NavBar() {
  const { user, profile } = useAuth();
  const { totalItens } = useCart();
  const { freteGratisAcima, primeiraCompraPercent } = useConfiguracoes();

  const avisos = [
    "Entregamos para todo o Brasil",
    freteGratisAcima > 0 && `Frete grátis acima de ${formatBRL(freteGratisAcima)}`,
    primeiraCompraPercent > 0 && `${primeiraCompraPercent}% off na primeira compra`,
  ].filter(Boolean);

  return (
    <div className="sticky top-0 z-30">
      <div className="hidden items-center justify-between bg-primary px-8 py-2 text-cream md:flex">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-cream/75">
          {avisos.join("  ·  ")}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={LOJA.instagram}
            target="_blank"
            aria-label="Instagram"
            className="text-cream/75 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faInstagram} />
          </Link>
          <Link
            href={whatsappLink()}
            target="_blank"
            aria-label="WhatsApp"
            className="text-cream/75 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faWhatsapp} />
          </Link>
        </div>
      </div>

      <NavMobile />

      <nav className="hidden w-full bg-brand md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-12">
            <Link href="/" className="shrink-0" aria-label={LOJA.nome}>
              <Image
                src="/logo-texto-creme.png"
                width={721}
                height={244}
                alt={LOJA.nome}
                priority
                className="h-[54px] w-auto"
              />
            </Link>
            <div className="flex items-center gap-8">
              <CustomLink link="/" title="Início" />
              <CustomLink link="/produtos" title="Catálogo" />
              <CustomLink link="/quem-somos" title="Quem Somos" />
              <CustomLink link="/fale-conosco" title="Atendimento" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href={user ? "/conta" : "/entrar"}
              className="flex items-center gap-2 font-sans text-[13px] font-medium uppercase tracking-[0.16em] text-cream/90 transition-colors duration-300 hover:text-gold"
            >
              <FontAwesomeIcon icon={faUser} />
              {user ? (profile?.full_name?.split(" ")[0] ?? "Minha Conta") : "Entrar"}
            </Link>
            <Link
              href="/carrinho"
              className="relative flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.16em] text-cream transition-all duration-300 hover:bg-gold hover:text-primary"
            >
              <FontAwesomeIcon icon={faBagShopping} />
              Carrinho
              {totalItens > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-[11px] font-semibold text-cream">
                  {totalItens}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="border-t border-gold/20">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-9 px-8 py-2.5">
            {CATEGORIAS.map((c) => (
              <Link
                key={c.slug}
                href={`/produtos?categoria=${c.slug}`}
                className="font-sans text-[11.5px] font-medium uppercase tracking-[0.2em] text-cream/70 transition-colors duration-300 hover:text-gold"
              >
                {c.nome}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
