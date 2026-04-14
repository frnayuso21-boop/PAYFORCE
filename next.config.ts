import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma Client debe ejecutarse en Node.js, no en Edge Runtime.
  // Necesario para que Vercel resuelva correctamente los bindings nativos.
  serverExternalPackages: ["@prisma/client", "prisma"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com"     },
      { protocol: "https", hostname: "images.unsplash.com"  },
      { protocol: "https", hostname: "plus.unsplash.com"    },
      // Logos de merchants — cualquier dominio HTTPS
      { protocol: "https", hostname: "**"                   },
    ],
  },
};

export default nextConfig;
