import Image from "next/image";
import logo from "../../../public/logo.png";
import rixxer from "../../../public/rixxer.png";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebook,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";

export default function Footer() {
  const data = new Date();
  const ano = data.getFullYear();

  return (
    <footer className="w-full bg-primary text-cream">
      <div className="container-page grid grid-cols-1 gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <Image
            src={logo}
            alt="Queijo Fazenda Santo Antônio"
            className="w-32 rounded-full ring-2 ring-gold/50"
          />
          <p className="max-w-xs font-sans text-sm leading-relaxed text-cream/70">
            Queijos artesanais produzidos com leite cru na Fazenda Santo
            Antônio, em Alagoa &mdash; MG. Tradição de família, premiada no
            Brasil e na França.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
          <h2 className="eyebrow text-gold">Institucional</h2>
          <Link href="/quem-somos" className="text-sm text-cream/80 transition-colors duration-300 hover:text-gold">
            Quem Somos
          </Link>
          <Link href="/fale-conosco" className="text-sm text-cream/80 transition-colors duration-300 hover:text-gold">
            Fale Conosco
          </Link>
          <Link href="/politica-de-privacidade" className="text-sm text-cream/80 transition-colors duration-300 hover:text-gold">
            Política de Privacidade
          </Link>
          <Link href="/politica-de-troca-e-devolucao" className="text-sm text-cream/80 transition-colors duration-300 hover:text-gold">
            Políticas de Troca e Devolução
          </Link>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
          <h2 className="eyebrow text-gold">Contato</h2>
          <p className="flex items-start gap-2 text-sm text-cream/80">
            <FontAwesomeIcon icon={faLocationDot} className="mt-1 text-gold" />
            Estrada Alagoa&ndash;Itamonte, KM 2, Bairro Prateado
          </p>
          <Link
            href="https://wa.me/+553598647172"
            target="_blank"
            className="flex items-center gap-2 text-sm text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faWhatsapp} />
            +55 (35) 99864-7172
          </Link>
          <Link
            href="https://www.instagram.com/queijofazendasantoantonio/"
            target="_blank"
            className="flex items-center gap-2 text-sm text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faInstagram} />
            Siga-nos no Instagram
          </Link>
          <Link
            href="https://www.facebook.com/queijofazendasantoantonio"
            target="_blank"
            className="flex items-center gap-2 text-sm text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faFacebook} />
            Curta nossa página no Facebook
          </Link>
        </div>
      </div>

      <div className="border-t border-gold/20 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
          <p className="text-xs text-cream/60">
            Queijo Fazenda Santo Antônio &mdash; Todos os Direitos Reservados, {ano}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-cream/60">Desenvolvido por</p>
            <a
              href="https://rixxer.com.br"
              target="_blank"
              rel="noreferrer"
              className="flex items-center font-bold text-gold transition-colors duration-300 hover:text-cream"
            >
              <Image src={rixxer} alt="Rixxer Corp" className="mx-2 w-10" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
