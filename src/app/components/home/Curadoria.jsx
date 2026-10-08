import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faUtensils, faTruckFast, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const pilares = [
  { icon: faMagnifyingGlass, titulo: "Seleção criteriosa", texto: "Qualidade, origem e sabor em cada rótulo escolhido." },
  { icon: faUtensils, titulo: "Boas combinações", texto: "Sugestões que valorizam ainda mais cada produto." },
  { icon: faTruckFast, titulo: "Para todo o Brasil", texto: "Frete calculado direto no carrinho, sem surpresa." },
];

function Arco({ src, alt, className = "", posicao = "object-center" }) {
  return (
    <div className={`rounded-t-full border border-gold/60 p-2 ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-t-full bg-primary">
        <Image src={src} alt={alt} fill sizes="(min-width: 768px) 22vw, 45vw" className={`object-cover ${posicao}`} />
      </div>
    </div>
  );
}

export default function Curadoria() {
  return (
    <section className="bg-brand py-20 text-cream md:py-28">
      <div className="container-page grid items-center gap-14 md:grid-cols-2">
        <div className="relative mx-auto h-[380px] w-full max-w-sm md:h-[500px]">
          <Arco src="/fotos/ref-casal.jpg" alt="Clientes brindando com vinho na loja" posicao="object-bottom" className="absolute left-0 top-0 h-[80%] w-[60%]" />
          <Arco src="/fotos/ref-tabua.jpg" alt="Tábua com pães, patês e embutidos" className="absolute bottom-0 right-0 h-[60%] w-[48%]" />
        </div>

        <div className="text-center md:text-left">
          <span className="eyebrow text-gold">Nossa curadoria</span>
          <h2 className="mt-4 font-display text-4xl font-medium leading-[1.08] md:text-5xl">
            Mais do que produtos,
            <br />
            <span className="font-script text-[1.3em] font-normal leading-none text-gold">bons momentos</span>{" "}
            à mesa
          </h2>
          <p className="mx-auto mt-6 max-w-lg leading-relaxed text-cream/80 md:mx-0">
            A Curadoria da Mesa nasceu com o propósito de reunir boas escolhas à
            mesa. Trazemos uma seleção especial de cervejas artesanais do Brasil
            e do mundo, sempre acompanhadas de sugestões que valorizam ainda mais
            cada rótulo.
          </p>

          <ul className="mt-9 grid gap-6 text-left sm:grid-cols-3">
            {pilares.map((p) => (
              <li key={p.titulo}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <FontAwesomeIcon icon={p.icon} />
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold">{p.titulo}</h3>
                <p className="mt-1 text-sm leading-snug text-cream/70">{p.texto}</p>
              </li>
            ))}
          </ul>

          <Link href="/produtos" className="btn-gold mt-10">
            Conhecer o catálogo
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      </div>
    </section>
  );
}
