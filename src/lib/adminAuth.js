// ATENÇÃO: server-only (usa a service role). Nunca importe em componentes client.
import { createClient } from "@supabase/supabase-js";

// Confere o Bearer token da requisição e devolve true só para usuários com role = admin.
export async function requisicaoDeAdmin(request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin";
}
