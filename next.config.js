/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Evita que o webpack tente empacotar resend e suas deps opcionais
    serverComponentsExternalPackages: ["resend"],
  },
};

module.exports = nextConfig;
