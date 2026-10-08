import Hero from "./components/home/Hero";
import CategoriasHome from "./components/home/CategoriasHome";
import Produtos from "./components/Produtos";
import Curadoria from "./components/home/Curadoria";
import InstagramFaixa from "./components/home/InstagramFaixa";
import CtaWhatsapp from "./components/home/CtaWhatsapp";

export default function Home() {
  return (
    <div>
      <Hero />
      <CategoriasHome />
      <Produtos />
      <Curadoria />
      <InstagramFaixa />
      <CtaWhatsapp />
    </div>
  );
}
