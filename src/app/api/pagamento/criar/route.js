import { createClient } from "@supabase/supabase-js";
import { criarLinkPagamento } from "@/lib/infinitepay";

// Cliente com service role — bypassa RLS para leitura de perfil e atualização do pedido.
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return Response.json({ error: "orderId obrigatório" }, { status: 400 });
    }

    const db = supabaseAdmin();

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, total, profile_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Busca perfil para pré-preencher o checkout InfinitePay
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, phone")
      .eq("id", order.profile_id)
      .single();

    const { data: authUser } = await db.auth.admin.getUserById(order.profile_id);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (!baseUrl) {
      return Response.json({ error: "NEXT_PUBLIC_SITE_URL não configurado" }, { status: 500 });
    }

    const result = await criarLinkPagamento({
      orderId,
      total: order.total,
      customer: {
        name: profile?.full_name,
        email: authUser?.user?.email,
        phone: profile?.phone,
      },
      redirectUrl: `${baseUrl}/pagamento/retorno?pedido=${orderId}`,
      webhookUrl: `${baseUrl}/api/pagamento/webhook`,
    });

    // Persiste o slug/id do link para correlacionar com o webhook depois
    await db
      .from("orders")
      .update({
        payment_provider: "infinitepay",
        payment_id: result.slug ?? result.id ?? null,
      })
      .eq("id", orderId);

    // A InfinitePay retorna a URL de checkout no campo `url`
    const checkoutUrl = result.url ?? result.checkout_url ?? result.link;
    if (!checkoutUrl) {
      console.error("InfinitePay: campo url ausente na resposta", result);
      return Response.json(
        { error: "Resposta inesperada da InfinitePay — campo url não encontrado" },
        { status: 502 }
      );
    }

    return Response.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Erro ao criar link InfinitePay:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
