import { supabase } from "../../config/supabase";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.curadoriadamesa.com.br";

// Atualiza a cada hora: produto novo entra no sitemap sem precisar de novo deploy.
export const revalidate = 3600;

const PAGINAS = [
  { caminho: "", prioridade: 1 },
  { caminho: "/produtos", prioridade: 0.9 },
  { caminho: "/quem-somos", prioridade: 0.5 },
  { caminho: "/fale-conosco", prioridade: 0.5 },
  { caminho: "/politica-de-privacidade", prioridade: 0.2 },
  { caminho: "/politica-de-troca-e-devolucao", prioridade: 0.2 },
];

export default async function sitemap() {
  const paginas = PAGINAS.map((p) => ({
    url: `${SITE}${p.caminho}`,
    lastModified: new Date(),
    priority: p.prioridade,
  }));

  // Se o banco estiver fora do ar na hora de gerar, o sitemap sai só com as páginas fixas.
  try {
    const { data } = await supabase.from("produtos").select("id, created_at").eq("ativo", true);
    const produtos = (data ?? []).map((p) => ({
      url: `${SITE}/detalhes?id=${p.id}`,
      lastModified: new Date(p.created_at),
      priority: 0.7,
    }));
    return [...paginas, ...produtos];
  } catch {
    return paginas;
  }
}
