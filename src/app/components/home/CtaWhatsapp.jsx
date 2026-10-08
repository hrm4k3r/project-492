import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { whatsappLink } from "../../../lib/loja";

export default function CtaWhatsapp() {
  return (
    <section className="bg-primary py-16 text-cream md:py-20">
      <div className="container-page flex flex-col items-center gap-6 text-center">
        <h2 className="font-display text-3xl font-medium leading-tight md:text-5xl">
          Não sabe qual escolher?
        </h2>
        <p className="max-w-xl text-cream/75">
          Fale com a curadoria e receba uma sugestão de rótulo e de harmonização
          para o seu momento.
        </p>
        <Link
          href={whatsappLink("Olá! Gostaria de uma sugestão da curadoria.")}
          target="_blank"
          className="btn-gold"
        >
          <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
          Conversar no WhatsApp
        </Link>
      </div>
    </section>
  );
}
