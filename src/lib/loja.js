export const LOJA = {
  nome: "Curadoria da Mesa",
  slogan: "Seleção de Sabores",
  whatsapp: "5535984265018",
  whatsappExibicao: "+55 (35) 98426-5018",
  instagram: "https://www.instagram.com/cura.doriadamesa/",
  endereco: "Av. Dr. Getúlio Vargas, 143, Centro, São Lourenço - MG",
};

export const whatsappLink = (texto) =>
  `https://wa.me/${LOJA.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;

export const CATEGORIAS = [
  { slug: "cervejas-nacionais", nome: "Cervejas Artesanais Nacionais" },
  { slug: "cervejas-importadas", nome: "Cervejas Importadas" },
  { slug: "vinhos", nome: "Vinhos" },
  { slug: "queijos", nome: "Queijos" },
  { slug: "cafes", nome: "Cafés" },
];

export const nomeDaCategoria = (slug) => CATEGORIAS.find((c) => c.slug === slug)?.nome ?? "";

export const SUGESTOES_PAIS = [
  "Brasil", "Bélgica", "Alemanha", "Itália", "França", "Portugal", "Espanha",
  "Argentina", "Chile", "Uruguai", "Inglaterra", "Irlanda", "Holanda",
  "República Tcheca", "Estados Unidos",
];

export const SUGESTOES_ESTILO = [
  "IPA", "APA", "Lager", "Pilsen", "Weiss", "Stout", "Porter", "Sour",
  "Belgian Ale", "Tripel", "Dubbel", "Saison", "Tinto", "Branco", "Rosé", "Espumante",
];

export const formatBRL = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
