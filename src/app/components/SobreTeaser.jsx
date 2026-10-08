import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export default function SobreTeaser() {
  return (
    <section className="bg-light py-20">
      <div className="container-page grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="order-2 flex justify-center md:order-1">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-card">
            <Image
              src="/who.png"
              alt="Queijos premiados da Fazenda Santo Antônio"
              width={480}
              height={600}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="order-1 md:order-2">
          <span className="eyebrow">Nossa história</span>
          <h2 className="section-title mt-2">
            De uma fazenda em Alagoa, para a sua mesa
          </h2>
          <p className="mt-5 text-primary/70">
            Há mais de 30 anos produzindo queijos, o Marcos segue a tradição
            aprendida com o pai e o avô. O nome &ldquo;Santo Antônio&rdquo; é
            uma homenagem ao seu sogro &mdash; e virou sinônimo de queijo
            premiado, feito com leite cru e muito amor.
          </p>
          <Link href="/quem-somos" className="btn-primary mt-8">
            Conheça nossa história
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      </div>
    </section>
  );
}
