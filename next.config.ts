import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable compression and etags to offload to Cloudflare and save Server CPU/Memory
  compress: false,
  generateEtags: false,
  poweredByHeader: false,
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
