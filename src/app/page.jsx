import CarrosselDetalhes from "./components/CarrosselDetalhes";
import SeloPremios from "./components/SeloPremios";
import Produtos from "./components/Produtos";
import SobreTeaser from "./components/SobreTeaser";
import RotaDoQueijo from "./components/RotadoQueijo";
import Blog from "./components/Blog";

export default function Home() {
  return (
    <div>
      <CarrosselDetalhes />
      <SeloPremios />
      <Produtos />
      <SobreTeaser />
      <RotaDoQueijo />
      <Blog />
    </div>
  );
}
