const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.curadoriadamesa.com.br";

// Áreas privadas ou sem valor para busca ficam fora do Google.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/auth/",
          "/conta",
          "/carrinho",
          "/pagamento",
          "/entrar",
          "/cadastro",
          "/esqueci-senha",
          "/redefinir-senha",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
