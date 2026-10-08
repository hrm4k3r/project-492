import { Suspense } from "react";
import Catalogo from "../components/Catalogo";

export const metadata = {
  title: "Catálogo | Curadoria da Mesa",
  description:
    "Cervejas artesanais nacionais e importadas, vinhos, queijos e cafés. Filtre por estilo, país de origem, marca e preço.",
};

export default function ProdutosPage() {
  return (
    <Suspense fallback={null}>
      <Catalogo />
    </Suspense>
  );
}
