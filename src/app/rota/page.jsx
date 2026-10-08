import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const galeria = [
  "/rota2.jpg", "/rota3.jpg", "/rota4.jpg", "/rota5.jpg",
  "/rota6.jpg", "/rota10.jpg", "/rota15.jpg", "/rota13.jpg",
  "/rota7.jpg", "/rota11.jpg", "/rota12.jpg", "/rota9.jpg",
  "/rota14.jpg", "/rota17.jpg", "/rota16.jpg",
];

const roteiro = [
  "Visita à Fazenda Cauré, para conhecer o plantio das oliveiras",
  "Almoço em restaurante local, para apreciar a comida mineira",
  "Visita à Cachoeira do Facão, para fazer fotos espetaculares",
  "Visita à Queijo Fazenda Santo Antônio, para conhecer nossa produção de queijos",
];

export default function Rota() {
  return (
    <main className="bg-light">
      <div className="relative flex h-[46vh] min-h-[320px] items-center justify-center overflow-hidden">
        <Image src="/rota5.jpg" alt="Rota do Queijo e do Azeite" fill sizes="100vw" priority className="object-cover" />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="container-page relative text-center text-cream">
          <span className="eyebrow text-gold">Experiência em Alagoa &mdash; MG</span>
          <h1 className="mt-2 font-display text-3xl italic md:text-5xl">
            Rota do Queijo e do Azeite
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-cream/85">
            Uma experiência incrível, que vai te levar à sabores e sensações
            espetaculares!
          </p>
        </div>
      </div>

      <section className="container-page grid grid-cols-1 items-center gap-12 py-16 md:grid-cols-2 md:py-20">
        <div>
          <span className="eyebrow">Terras Altas da Mantiqueira</span>
          <h2 className="section-title mt-2">
            Natureza, tradição e sabor em um só passeio
          </h2>
          <p className="mt-5 text-primary/70">
            Imagine conhecer uma cidade cercada por muita natureza, paz,
            tranquilidade, cachoeiras incríveis, o{" "}
            <span className="font-semibold text-primary">Plantio das Oliveiras</span>, ou até a
            fabricação do{" "}
            <span className="font-semibold text-primary">famoso e premiado Queijo de Alagoa</span>?
          </p>
          <p className="mt-4 text-primary/70">
            O Queijo Fazenda Santo Antônio vai proporcionar essa rica
            experiência para você, com nossa Rota do Queijo e do Azeite!
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-card">
          <Image src="/rota1.jpg" alt="Conheça Alagoa" width={900} height={700} className="h-full w-full object-cover" />
        </div>
      </section>

      <section className="container-page grid grid-cols-1 items-center gap-12 py-8 md:grid-cols-2 md:py-12">
        <div className="order-2 overflow-hidden rounded-2xl shadow-card md:order-1">
          <Image src="/rota8.jpg" alt="Produção de queijos premiados" width={900} height={700} className="h-full w-full object-cover" />
        </div>
        <div className="order-1 md:order-2">
          <h2 className="section-title">Conheça hoje mesmo</h2>
          <p className="mt-5 text-primary/70">
            Um passeio que vai permitir que você e toda sua família conheça a
            belíssima Alagoa, a mais alta das Terras Altas da Mantiqueira.
            Você vai visitar também a{" "}
            <span className="font-semibold text-primary">Fazenda Cauré</span>, onde é
            produzido o melhor azeite do Hemisfério Sul, e ainda vai conhecer
            a produção de queijos premiados em vários concursos no Brasil e
            no mundo, na{" "}
            <span className="font-semibold text-primary">Fazenda Santo Antônio</span>.
          </p>
        </div>
      </section>

      <section className="bg-primary py-16 text-cream md:py-20">
        <div className="container-page grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <span className="eyebrow text-gold">O que está incluso</span>
            <h2 className="mt-2 font-display text-3xl italic md:text-4xl">
              Nesse passeio, você vai conhecer:
            </h2>
            <ul className="mt-6 space-y-3">
              {roteiro.map((item) => (
                <li key={item} className="flex items-start gap-3 text-cream/85">
                  <FontAwesomeIcon icon={faCheck} className="mt-1 text-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-6 rounded-2xl bg-cream/5 p-8 ring-1 ring-gold/20">
            <p className="text-cream/85">
              Tudo isso por apenas
            </p>
            <p className="font-display text-4xl text-gold">R$ 200,00 <span className="text-lg text-cream/70">por pessoa</span></p>
            <p className="text-sm text-cream/60">Escolha a forma de reserva e garanta sua vaga:</p>
            <div className="flex flex-col gap-3">
              <Link
                href="https://payment-link.pagar.me/pl_AaWwRN56yZXKRgBSOU351Y7Jxoe8m0BL"
                target="_blank"
                className="btn-gold"
              >
                Comprar &ndash; Individual
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
              <Link
                href="https://payment-link.pagar.me/pl_7zoMwQmPg2jrZXC2ecBYE86W3bxVX90D"
                target="_blank"
                className="btn-outline border-gold/50 text-cream hover:bg-gold hover:text-primary"
              >
                Comprar &ndash; 2 Pessoas
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-page">
          <h2 className="section-title text-center">A experiência em imagens</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
            {galeria.map((src) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-xl">
                <Image src={src} alt="Rota do Queijo e do Azeite" fill sizes="20vw" className="object-cover transition-transform duration-500 hover:scale-110" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
