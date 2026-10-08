import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBeerMugEmpty, faEarthAmericas, faWineGlass, faCheese, faMugHot, faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { CATEGORIAS } from "../../../lib/loja";

const detalhes = {
  "cervejas-nacionais": { icon: faBeerMugEmpty, texto: "Rótulos brasileiros com personalidade" },
  "cervejas-importadas": { icon: faEarthAmericas, texto: "Clássicos e descobertas do mundo" },
  vinhos: { icon: faWineGlass, texto: "Selecionados por origem e perfil" },
  queijos: { icon: faCheese, texto: "Para acompanhar cada rótulo" },
  cafes: { icon: faMugHot, texto: "Especiais, com origem e sabor" },
};

export default function CategoriasHome() {
  return (
    <section className="bg-light py-20 md:py-24">
      <div className="container-page">
        <div className="text-center">
          <span className="eyebrow">Navegue pela curadoria</span>
          <h2 className="section-title mt-3">Tudo o que combina com a sua mesa</h2>
          <span className="filete mt-6" />
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4 md:gap-5">
          {CATEGORIAS.map((c) => {
            const d = detalhes[c.slug];
            return (
              <Link
                key={c.slug}
                href={`/produtos?categoria=${c.slug}`}
                className="group flex basis-[calc(50%-0.5rem)] flex-col items-center rounded-2xl border border-cardBorder bg-white p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card md:basis-[calc(33.333%-0.9rem)] lg:basis-[calc(20%-1rem)]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-2xl text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-cream">
                  <FontAwesomeIcon icon={d.icon} />
                </span>
                <h3 className="mt-5 font-display text-[1.35rem] font-semibold leading-tight text-primary">
                  {c.nome}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-snug text-primary/60">{d.texto}</p>
                <span className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-terracotta">
                  Ver
                  <FontAwesomeIcon icon={faArrowRight} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
