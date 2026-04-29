import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "xlsx",
    "@react-pdf/renderer",
  ],

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

  outputFileTracingExcludes: {
    "*": ["payforce-migrate/**", "payforcesystems/**", "scripts/**"],
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
};

export default nextConfig;
