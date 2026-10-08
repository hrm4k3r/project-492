import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruckFast, faQrcode, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { whatsappLink } from "../../../lib/loja";

const diferenciais = [
  { icon: faTruckFast, texto: "Entrega para todo o Brasil" },
  { icon: faQrcode, texto: "Pagamento por Pix" },
  { icon: faWhatsapp, texto: "Atendimento pelo WhatsApp" },
];

function Arco({ src, alt, className = "", prioridade = false }) {
  return (
    <div className={`rounded-t-full border border-gold/60 p-2 ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-t-full bg-primary">
        <Image
          src={src}
          alt={alt}
          fill
          priority={prioridade}
          sizes="(min-width: 768px) 24vw, 50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand text-cream">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_45%,rgba(201,163,106,0.22),transparent_62%)]" />

      <div className="container-page relative grid items-center gap-12 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div className="text-center md:text-left">
          <span className="eyebrow text-gold">Seleção de sabores</span>
          <h1 className="mt-5 font-display text-[3.4rem] font-medium leading-[0.98] md:text-[5.6rem]">
            Boas escolhas
            <br />
            <span className="text-cream/90">à </span>
            <span className="font-script text-[1.25em] font-normal leading-none text-gold">mesa</span>
          </h1>
          <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-cream/80 md:mx-0 md:text-lg">
            Cervejas artesanais do Brasil e do mundo, vinhos, queijos e cafés
            escolhidos com olhar atento para qualidade, origem e sabor, com
            sugestões que valorizam cada rótulo.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <Link href="/produtos" className="btn-gold w-full sm:w-auto">
              Explorar o catálogo
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <Link
              href={whatsappLink("Olá! Gostaria de uma sugestão da curadoria.")}
              target="_blank"
              className="btn-ghost-cream w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={faWhatsapp} />
              Pedir uma sugestão
            </Link>
          </div>

          <ul className="mt-10 flex flex-col items-center gap-3 text-[13px] text-cream/75 sm:flex-row sm:flex-wrap sm:gap-x-7 md:justify-start">
            {diferenciais.map((d) => (
              <li key={d.texto} className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={d.icon} className="text-gold" />
                {d.texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto h-[400px] w-full max-w-[22rem] md:h-[560px] md:max-w-md">
          <Arco
            src="/fotos/ref-vinho.jpg"
            alt="Taça de vinho tinto ao lado da garrafa"
            prioridade
            className="absolute right-0 top-0 h-[78%] w-[62%]"
          />
          <Arco
            src="/fotos/ref-cerveja-belga.jpg"
            alt="Cerveja belga servida em taça"
            className="absolute bottom-0 left-0 h-[58%] w-[50%]"
          />
          <div className="absolute left-[6%] top-[8%] flex h-24 w-24 items-center justify-center rounded-full border border-gold/60 bg-brand md:h-28 md:w-28">
            <Image src="/emblema-creme.png" width={246} height={233} alt="" className="h-14 w-auto md:h-16" />
          </div>
        </div>
      </div>
    </section>
  );
}
