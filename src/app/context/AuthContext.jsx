"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../../config/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session);
      setLoading(false);
    }

    async function handleSession(session) {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        setProfile(data ?? null);
      } else {
        setProfile(null);
      }
    }

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session);
      // Link de recuperação no formato padrão do Supabase: volta para o site já com sessão.
      // Leva direto para a tela de nova senha em vez de deixar o cliente "logado" na home.
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/redefinir-senha") {
        window.location.replace("/redefinir-senha");
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === "admin", signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
