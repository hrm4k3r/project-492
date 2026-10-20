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
  webpack: (config) => {
    // @react-email/render é peer dependency opcional do resend — não usamos
    config.resolve.alias["@react-email/render"] = false;
    return config;
  },
};

module.exports = nextConfig;
