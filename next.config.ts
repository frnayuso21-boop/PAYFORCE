import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com"     },
      { protocol: "https", hostname: "images.unsplash.com"  },
      { protocol: "https", hostname: "plus.unsplash.com"    },
      { protocol: "https", hostname: "**"                   },
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.json",
  },

  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/payforce-migrate/**",
        "**/payforcesystems/**",
        "**/scripts/**",
      ],
    };
    return config;
  },

  experimental: {
    outputFileTracingExcludes: {
      "*": [
        path.join(__dirname, "payforce-migrate"),
        path.join(__dirname, "payforcesystems"),
        path.join(__dirname, "scripts"),
      ],
    },
  },
};

export default nextConfig;
