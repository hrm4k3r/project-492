import Image from "next/image";
import logo from "../../../public/logo.png";
import rixxer from "../../../public/rixxer.png";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { LOJA, whatsappLink } from "../../lib/loja";

export default function Footer() {
  const data = new Date();
  const ano = data.getFullYear();

  return (
    <footer className="w-full bg-primary text-cream">
      <div className="container-page grid grid-cols-1 gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <Image
            src={logo}
            alt={LOJA.nome}
            className="w-32 rounded-full ring-2 ring-gold/50"
          />
          <p className="max-w-xs font-sans text-sm leading-relaxed text-cream/70">
            Cervejas, vinhos, queijos e cafés escolhidos com cuidado para
            inspirar combinações, descobertas e bons momentos à mesa.
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
            {LOJA.endereco}
          </p>
          <Link
            href={whatsappLink()}
            target="_blank"
            className="flex items-center gap-2 text-sm text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faWhatsapp} />
            {LOJA.whatsappExibicao}
          </Link>
          <Link
            href={LOJA.instagram}
            target="_blank"
            className="flex items-center gap-2 text-sm text-cream/80 transition-colors duration-300 hover:text-gold"
          >
            <FontAwesomeIcon icon={faInstagram} />
            Siga-nos no Instagram
          </Link>
        </div>
      </div>

      <div className="border-t border-gold/20 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
          <p className="text-xs text-cream/60">
            {LOJA.nome} &mdash; Todos os Direitos Reservados, {ano}. Beba com moderação. Venda proibida para menores de 18 anos.
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
