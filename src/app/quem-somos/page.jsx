import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAward, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const medalhas = [
  { ano: "2018", titulo: "Prêmio Queijo Brasil (SP)", texto: "3 medalhas de ouro" },
  { ano: "2019", titulo: "Prêmio Queijo Brasil (Araxá)", texto: "2 pratas e 1 bronze" },
  { ano: "2019", titulo: "Prêmio Queijo Brasil (SP)", texto: "2 ouros e 1 prata" },
  { ano: "2020/21", titulo: "Concours Mondial du Fromage (França)", texto: "Medalha de bronze" },
  { ano: "2021", titulo: "Super Concurso Mundial do Queijo Brasil", texto: "3 medalhas" },
  { ano: "2023", titulo: "Concours Mondial du Fromage (França)", texto: "2 pratas e 1 bronze" },
];

export default function QuemSomos() {
  return (
    <div className="bg-light">
      <div className="relative flex h-[42vh] min-h-[280px] items-center justify-center overflow-hidden">
        <Image
          src="/rota8.jpg"
          alt="Produção artesanal na Fazenda Santo Antônio"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="container-page relative text-center text-cream">
          <span className="eyebrow text-gold">Nossa história</span>
          <h1 className="mt-2 font-display text-3xl italic md:text-5xl">
            Quem Somos
          </h1>
        </div>
      </div>

      <div className="container-page py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-lg leading-relaxed text-primary/80">
            Veja o relato do <span className="font-semibold text-primary">Marcos</span>,
            produtor e proprietário da Fazenda Santo Antônio:
          </p>

          <div className="prose-policy mt-8 space-y-5 text-base leading-relaxed text-primary/80">
            <p>
              Quando eu era criança, meu avô tinha um laticínio no bairro
              Quilombo, em Alagoa, laticínio antigo. O Prefeito da Cidade de
              Alagoa, em Minas Gerais, está pensando em tombar como
              patrimônio histórico esse laticínio. Meu pai tinha um
              colaborador chamado &ldquo;Seu Chico&rdquo;, que trabalhava e
              fazia os queijos com ele, eu tinha por volta de 7 anos nessa
              época. Eu, sempre apaixonado por queijo e procurando sempre
              acompanhar meu pai, não podia ver uma massa de queijo que
              ficava doido pra comer! Eu ia no laticínio todos os dias,
              depois da escola, estudava na parte na tarde. Todos os dias
              que passava no laticínio, &ldquo;Seu Chico&rdquo; falava pra
              mim: &ldquo;você pode comer a massa do queijo, mas vai ter que
              fazer também&rdquo;. Fui ajudando e aprendendo com ele, desde
              pequeno.
            </p>
            <p>
              Ele foi me ensinando a fazer, como enformar, dar ponto na
              massa, há muitos anos atrás. Hoje tenho 40 anos, tem mais de 30
              anos que iniciei a produção de queijos. De lá pra cá, eu mexo
              com queijo, desde criança. A história da minha família vem
              desde os avós mexendo com leite, e nesse caminho acabei
              começando a mexer com as vacas. Comprei uma bezerrinha, meu
              sonho era ser dono de fazenda, mas não sabia que dava tanto
              trabalho... Começou na brincadeira, trabalhava de ajudante de
              fazenda, fui juntando o dinheiro que ganhava deste trabalho
              para comprar minha primeira bezerra, depois comprei mais uma,
              viraram novilho, vaca, e então comecei a mexer com leite, com
              poucas vacas, comecei a mexer com queijo, bem pouquinho...
            </p>
            <p className="border-l-2 border-gold pl-5 font-display text-xl italic text-primary">
              Fui crescendo devagar na produção...
            </p>
            <p>
              Depois de muitos anos mexendo com leite, já tinha crescido um
              pouco, mais vacas e adquiri uma estrutura melhor. Casei com a
              Patrícia, que é minha esposa até hoje! Por conta de meu
              casamento que surgiu o nome da fazenda e do queijo, porque o
              meu sogro chamava Antônio, uma pessoa maravilhosa, muito
              bacana, um paizão pra mim, tinha muito luxo com a família,
              muito amoroso, uma bondade de pessoa. Ele faleceu há 13 anos
              aproximadamente, o nome da marca foi em homenagem a ele!
            </p>
            <p>
              Surgiu a necessidade de pensar no rótulo e na marca do queijo,
              pois os Queijos da Alagoa começaram a ficar conhecidos no
              Brasil e no Exterior. A gente não tinha costume de usar
              rótulos ou marca em nossos queijos, a gente vendia tudo no
              saquinho mesmo, coisa simples, a gente punha num saco de ração
              mesmo e mandava para o atravessador, pagava muito pouquinho
              pra ele, quase não tinha lucro. Percebi alguns laticínios
              criando rótulos na frente do meu e achei interessante, a gente
              precisava criar uma marca do queijo da gente. Desde então,
              resolvi fazer o rótulo, demorei uns 2 anos para finalizar essa
              etapa.
            </p>
            <p>
              Pintou um Concurso em São Paulo chamado Prêmio Queijo Brasil, o
              primeiro concurso que disputei, não tinha conhecimento com
              concurso, mas fui com muita fé participar. Esse concurso
              aconteceu em 2018, tinha pouco conhecimento mesmo, fiz três
              queijos e mandei, fiquei na expectativa, aguardando pelo
              resultado. De repente, recebi a notícia de que havia ganhado 3
              medalhas de ouro nesse concurso. Fiquei extremamente feliz!
            </p>
            <p>
              Passados 6 meses deste primeiro concurso, apareceu o próximo,
              que foi o de Araxá, Prêmio Queijo Brasil. Mandei mais 3
              queijos, acabei ganhando 2 medalhas de prata e uma bronze. Isso
              me deixou também muito feliz. Esse foi em 2019. No mesmo ano,
              teve novamente o Queijo Brasil em SP, mandei mais 3 queijos e
              ganhei mais 2 ouros e 1 prata! Assim a marca foi ficando cada
              vez mais famosa.
            </p>
            <p>
              De 2020 pra 2021 pintou o Concurso na França. Já tinham 2
              produtores da cidade que tinham Medalha de Ouro na França. O
              Osvaldinho &ldquo;Queijo Alagoa&rdquo; e o Renato &ldquo;Bela
              Vista&rdquo;. Pensei comigo, se eu ganhasse seria muito legal
              também, um prêmio internacional. Virei associado da
              &ldquo;Sertãobras&rdquo; e a Débora, que é Presidente e mora
              na França, me auxiliou na inscrição do concurso. Inscrevi o
              meu queijo e mandei para a França. Pensei: &ldquo;ahh, muito
              difícil, um dos maiores concursos do mundo&rdquo;. De repente,
              recebi a notícia que ganhei uma medalha de bronze na França,
              nossa, quase &ldquo;morri de gosto&rdquo;! Depois desse
              concurso da França, a Débora mesmo trouxe esse concurso da
              França para o Brasil, para o Museu das Artes em São Paulo, ela
              fez um Super Concurso Mundial do Queijo Brasil, que é o mesmo
              concurso da França. Nesta ocasião, mandei 3 queijos e ganhei
              mais 3 medalhas!
            </p>
            <p>
              No ano de 2023, teve novamente o concurso da França. Mandei
              mais 3 queijos, e fui premiado novamente! Ganhamos 2 medalhas
              de prata e 1 de bronze, para nossa completa alegria.
            </p>
            <p className="font-medium text-primary">
              E assim caminhamos, trabalhando arduamente para produzir
              queijos de qualidade e estar entre os melhores queijos do
              mundo!
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="section-title text-center">Nossas conquistas</h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {medalhas.map((m) => (
              <div key={m.titulo + m.ano} className="card-surface flex flex-col gap-2 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-gold">
                  <FontAwesomeIcon icon={faAward} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-terracotta">{m.ano}</span>
                <p className="font-display text-base text-primary">{m.titulo}</p>
                <p className="text-sm text-primary/60">{m.texto}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-16 flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-primary/70">
            Quer conhecer de perto a produção e provar nossos queijos
            premiados?
          </p>
          <Link href="/rota" className="btn-primary">
            Conheça a Rota do Queijo e do Azeite
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      </div>
    </div>
  );
}
