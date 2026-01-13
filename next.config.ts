import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    // config.cache = false;
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["sistema.maccell.com.ar", "localhost:3000"],
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
