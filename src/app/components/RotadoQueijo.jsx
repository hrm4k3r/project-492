import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export default function RotaDoQueijo() {
  return (
    <section className="relative overflow-hidden bg-primary py-20 text-cream">
      <Image
        src="/rota5.jpg"
        alt="Rota do Queijo e do Azeite"
        fill
        sizes="100vw"
        className="object-cover opacity-25"
      />
      <div className="container-page relative flex flex-col items-center text-center">
        <span className="eyebrow text-gold">Experiência</span>
        <h2 className="section-title mt-2 text-cream">
          Rota do Queijo e do Azeite
        </h2>
        <p className="mt-4 max-w-xl text-cream/80">
          Conheça a fazenda, veja o queijo sendo feito, visite o plantio de
          oliveiras e uma cachoeira &mdash; um dia inteiro de sabores e
          sensações em Alagoa, nas Terras Altas da Mantiqueira.
        </p>
        <Link href="/rota" className="btn-gold mt-8">
          Reservar minha experiência
          <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      </div>
    </section>
  );
}
