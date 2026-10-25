import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App privada: todas as páginas dependem do utilizador autenticado, por isso não há pré-renderização.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["playwright", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }];
  },
};

export default nextConfig;
