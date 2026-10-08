import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAward,
  faCow,
  faSeedling,
  faTruckFast,
} from "@fortawesome/free-solid-svg-icons";

const items = [
  {
    icon: faAward,
    title: "Premiado na França",
    text: "Medalhas no Concours Mondial du Fromage",
  },
  {
    icon: faCow,
    title: "Leite Cru",
    text: "Da nossa própria fazenda, em Alagoa (MG)",
  },
  {
    icon: faSeedling,
    title: "100% Artesanal",
    text: "Receita e cuidado de três gerações",
  },
  {
    icon: faTruckFast,
    title: "Frete Grátis",
    text: "Em compras acima de R$ 1.000,00",
  },
];

export default function SeloPremios() {
  return (
    <section className="border-y border-cardBorder bg-cream">
      <div className="container-page grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col items-center gap-2 text-center md:flex-row md:items-start md:gap-4 md:text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-gold">
              <FontAwesomeIcon icon={item.icon} />
            </span>
            <div>
              <p className="font-display text-sm text-primary md:text-base">{item.title}</p>
              <p className="text-xs text-primary/60">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
