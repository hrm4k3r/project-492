import { createClient } from "@supabase/supabase-js";
import { cotarFrete } from "../../../../lib/frete";

export const dynamic = "force-dynamic";

function supabasePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function POST(request) {
  const { cep, itens } = await request.json();

  if (!cep || !Array.isArray(itens) || itens.length === 0) {
    return Response.json({ error: "cep e itens são obrigatórios." }, { status: 400 });
  }

  try {
    return Response.json(await cotarFrete(supabasePublico(), cep, itens));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
