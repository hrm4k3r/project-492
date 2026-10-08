import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBeerMugEmpty, faEarthAmericas, faGem } from "@fortawesome/free-solid-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { LOJA } from "../../lib/loja";

export const metadata = {
  title: "Quem Somos | Curadoria da Mesa",
  description:
    "A Curadoria da Mesa nasceu para reunir sabores, histórias e experiências em um só lugar: vinhos, cafés especiais, charcutaria, queijos, doces e uma grande seleção de cervejas.",
};

const encontre = ["Vinhos", "Cafés especiais", "Charcutaria", "Queijos", "Doces"];

const destaques = [
  { icon: faBeerMugEmpty, titulo: "Mais de 100 rótulos", texto: "Cervejas importadas e artesanais nacionais em curadoria." },
  { icon: faEarthAmericas, titulo: "Estilos, países e tradições", texto: "Uma viagem pelos sabores de diferentes culturas cervejeiras." },
  { icon: faGem, titulo: "Clássicos e raridades", texto: "Para revisitar grandes nomes e descobrir verdadeiras preciosidades." },
];

function Arco({ src, alt, className = "", posicao = "object-center" }) {
  return (
    <div className={`rounded-t-full border border-gold/60 p-2 ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-t-full bg-primary">
        <Image src={src} alt={alt} fill sizes="(min-width: 768px) 24vw, 50vw" className={`object-cover ${posicao}`} />
      </div>
    </div>
  );
}

export default function QuemSomos() {
  return (
    <div className="bg-light">
      <section className="relative overflow-hidden bg-brand text-cream">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,163,106,0.22),transparent_65%)]" />
        <div className="container-page relative flex flex-col items-center py-16 text-center md:py-24">
          <Image src="/emblema-creme.png" width={246} height={233} alt="" className="h-16 w-auto md:h-20" />
          <span className="eyebrow mt-6 text-gold">Nossa história</span>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.05] md:text-7xl">
            Grandes momentos começam com
            <br />
            <span className="font-script text-[1.25em] font-normal leading-none text-gold">boas escolhas</span>
          </h1>
        </div>
      </section>

      <section className="container-page py-16 md:py-24">
        <div className="grid items-center gap-14 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="font-display text-3xl font-medium leading-snug text-primary md:text-4xl">
              A {LOJA.nome} nasceu para reunir sabores, histórias e experiências
              em um só lugar.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-primary/75">
              Aqui você encontra vinhos, cafés especiais, charcutaria, queijos,
              doces e uma seleção de produtos escolhidos com cuidado para
              transformar cada encontro em uma ocasião especial.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2">
              {encontre.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-cardBorder bg-white px-4 py-1.5 text-[13px] font-medium text-primary/80"
                >
                  {item}
                </li>
              ))}
            </ul>

            <h2 className="mt-14 font-display text-3xl font-medium text-primary md:text-4xl">
              E, entre tantas descobertas, as cervejas ocupam um lugar de destaque
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-primary/75">
              Estamos construindo uma curadoria com mais de 100 rótulos de
              cervejas importadas e artesanais nacionais, reunindo diferentes
              estilos, países e tradições. Uma seleção pensada para quem aprecia
              qualidade, gosta de explorar novos sabores, revisitar grandes
              clássicos e descobrir verdadeiras raridades.
            </p>
          </div>

          <div className="relative mx-auto h-[420px] w-full max-w-sm md:h-[520px]">
            <Arco
              src="/fotos/ref-vinho.jpg"
              alt="Taça de vinho tinto ao lado da garrafa"
              className="absolute right-0 top-0 h-[78%] w-[62%]"
            />
            <Arco
              src="/fotos/ref-cerveja-belga.jpg"
              alt="Cerveja belga servida em taça"
              className="absolute bottom-0 left-0 h-[56%] w-[50%]"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="container-page grid items-center gap-14 md:grid-cols-[0.8fr_1.2fr]">
          <div className="mx-auto w-full max-w-sm">
            <Arco
              src="/fotos/ref-casal.jpg"
              alt="Lidiane e Alessandro, donos da Curadoria da Mesa, brindando com vinho"
              posicao="object-bottom"
              className="aspect-[3/4.2] w-full"
            />
          </div>

          <div>
            <span className="eyebrow">Quem está por trás</span>
            <h2 className="mt-3 font-display text-4xl font-medium leading-[1.1] text-primary md:text-5xl">
              Prazer, somos{" "}
              <span className="font-script text-[1.2em] font-normal leading-none text-terracotta">
                Lidiane e Alessandro
              </span>
            </h2>

            <div className="mt-7 space-y-5 text-lg leading-relaxed text-primary/75">
              <p>
                Um casal que ama comer, beber, viajar, conhecer lugares novos e,
                principalmente, experimentar coisas boas.
              </p>
              <p>
                A cerveja faz parte da nossa história há muitos anos. O
                Alessandro está há 10 anos nesse universo e atuou
                profissionalmente como mestre cervejeiro. Ao longo dessa
                trajetória, foi se apaixonando por tudo o que envolve uma boa
                cerveja: os estilos, os ingredientes, os aromas, os sabores e as
                histórias por trás de cada rótulo.
              </p>
              <p>
                A Lidiane sempre foi aquela companhia que adora experimentar,
                conhecer coisas novas e, principalmente, compartilhar essas
                descobertas.
              </p>
              <p>
                Foi da união dessas paixões que nasceu a Curadoria da Mesa. Aqui,
                cada produto é escolhido por nós, com carinho e atenção aos
                detalhes, muitas vezes depois de muita conversa, pesquisa e,
                claro, degustação.
              </p>
            </div>

            <div className="mt-9 rounded-2xl border border-gold/50 bg-light p-7">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-terracotta">
                A nossa regra é simples
              </p>
              <p className="mt-3 font-display text-3xl font-medium italic leading-snug text-primary md:text-4xl">
                &ldquo;A gente colocaria isso na nossa mesa?&rdquo;
              </p>
              <p className="mt-3 text-primary/70">
                Se a resposta for sim, esse produto tem grandes chances de fazer
                parte da curadoria.
              </p>
            </div>

            <p className="mt-9 text-lg leading-relaxed text-primary/75">
              Mais do que uma loja, queremos criar uma mesa cheia de boas
              histórias, descobertas e sabores para compartilhar.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-sand py-16 md:py-20">
        <div className="container-page grid gap-10 text-center md:grid-cols-3">
          {destaques.map((d) => (
            <div key={d.titulo} className="flex flex-col items-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-brand shadow-soft">
                <FontAwesomeIcon icon={d.icon} />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-primary">{d.titulo}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-primary/65">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand py-20 text-cream md:py-28">
        <div className="container-page flex flex-col items-center text-center">
          <blockquote className="max-w-3xl font-display text-3xl font-medium italic leading-snug md:text-5xl">
            &ldquo;Uma boa cerveja vai muito além da bebida: ela carrega
            cultura, história e cria momentos que merecem ser
            compartilhados.&rdquo;
          </blockquote>
          <span className="filete mt-10" />
          <p className="mt-10 font-script text-5xl text-gold md:text-6xl">Sejam muito <span className="whitespace-nowrap">bem&#8209;vindos</span></p>
          <p className="mt-4 max-w-xl text-cream/80">
            à nossa mesa. É um prazer ter vocês por aqui: um novo jeito de
            descobrir, degustar e celebrar.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/produtos" className="btn-gold">
              Conhecer o catálogo
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <Link href={LOJA.instagram} target="_blank" className="btn-ghost-cream">
              <FontAwesomeIcon icon={faInstagram} />
              Seguir no Instagram
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
