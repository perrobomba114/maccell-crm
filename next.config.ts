import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // config.cache = false;
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
