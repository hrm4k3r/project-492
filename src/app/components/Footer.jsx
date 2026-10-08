import Image from "next/image";
import Link from "next/link";
import rixxer from "../../../public/rixxer.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { CATEGORIAS, LOJA, whatsappLink } from "../../lib/loja";

const linkClass = "text-sm text-cream/80 transition-colors duration-300 hover:text-gold";
const tituloClass = "font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-gold";

export default function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer className="w-full bg-brand text-cream">
      <div className="container-page grid grid-cols-1 gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
          <Image
            src="/logo-creme.png"
            width={749}
            height={497}
            alt={LOJA.nome}
            className="h-auto w-44"
          />
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">
            Cervejas, vinhos, queijos e cafés escolhidos com cuidado para
            inspirar combinações, descobertas e bons momentos à mesa.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
          <h2 className={tituloClass}>Catálogo</h2>
          {CATEGORIAS.map((c) => (
            <Link key={c.slug} href={`/produtos?categoria=${c.slug}`} className={linkClass}>
              {c.nome}
            </Link>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
          <h2 className={tituloClass}>Institucional</h2>
          <Link href="/quem-somos" className={linkClass}>Quem Somos</Link>
          <Link href="/fale-conosco" className={linkClass}>Fale Conosco</Link>
          <Link href="/politica-de-privacidade" className={linkClass}>Política de Privacidade</Link>
          <Link href="/politica-de-troca-e-devolucao" className={linkClass}>Trocas e Devoluções</Link>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
          <h2 className={tituloClass}>Contato</h2>
          <p className="flex items-start gap-2 text-sm text-cream/80">
            <FontAwesomeIcon icon={faLocationDot} className="mt-1 text-gold" />
            {LOJA.endereco}
          </p>
          <Link href={whatsappLink()} target="_blank" className={`${linkClass} flex items-center gap-2`}>
            <FontAwesomeIcon icon={faWhatsapp} />
            {LOJA.whatsappExibicao}
          </Link>
          <Link href={LOJA.instagram} target="_blank" className={`${linkClass} flex items-center gap-2`}>
            <FontAwesomeIcon icon={faInstagram} />
            @cura.doriadamesa
          </Link>
        </div>
      </div>

      <div className="border-t border-gold/20 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
          <p className="max-w-2xl text-xs leading-relaxed text-cream/60">
            {LOJA.nome} &mdash; CNPJ {LOJA.cnpj} &mdash; Todos os direitos
            reservados, {ano}. Venda proibida para menores de 18 anos. Beba com
            moderação.
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
