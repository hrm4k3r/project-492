import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { LOJA } from "../../../lib/loja";

const fotos = [
  { src: "/fotos/ref-cerveja-ambar.jpg", alt: "Cerveja âmbar em taça" },
  { src: "/fotos/ref-queijo-geleia.jpg", alt: "Queijo com geleia e cerveja belga" },
  { src: "/fotos/ref-cerveja-zot.jpg", alt: "Cerveja belga em taça" },
  { src: "/fotos/ref-tabua.jpg", alt: "Tábua de frios e pães" },
  { src: "/fotos/ref-frutas-vermelhas.jpg", alt: "Cerveja de frutas vermelhas" },
];

export default function InstagramFaixa() {
  return (
    <section className="bg-light py-20 md:py-24">
      <div className="container-page">
        <div className="text-center">
          <span className="eyebrow">No Instagram</span>
          <h2 className="section-title mt-3">@cura.doriadamesa</h2>
          <p className="mx-auto mt-4 max-w-md text-primary/65">
            Novidades, lançamentos e harmonizações para inspirar a sua próxima mesa.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {fotos.map((f, i) => (
            <Link
              key={f.src}
              href={LOJA.instagram}
              target="_blank"
              aria-label={`Ver no Instagram: ${f.alt}`}
              className={`group relative aspect-square overflow-hidden rounded-xl bg-sand ${i === 4 ? "hidden sm:block" : ""}`}
            >
              <Image
                src={f.src}
                alt={f.alt}
                fill
                sizes="(min-width: 768px) 20vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-primary/0 text-3xl text-cream opacity-0 transition-all duration-300 group-hover:bg-primary/45 group-hover:opacity-100">
                <FontAwesomeIcon icon={faInstagram} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href={LOJA.instagram} target="_blank" className="btn-outline">
            <FontAwesomeIcon icon={faInstagram} />
            Seguir no Instagram
          </Link>
        </div>
      </div>
    </section>
  );
}
