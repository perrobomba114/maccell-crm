import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MACCELL_BUILD_DIR ?? '.next',
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/schematics/pdf-assets/*': ['./node_modules/pdfjs-dist/build/pdf.worker.min.mjs', './node_modules/pdfjs-dist/cmaps/**/*', './node_modules/pdfjs-dist/standard_fonts/**/*', './node_modules/pdfjs-dist/wasm/**/*'],
  },
  // Disable compression and etags to offload to Cloudflare and save Server CPU/Memory
  compress: false,
  generateEtags: false,
  poweredByHeader: false,

  // Disable Image Optimization to prevent worker crash
  images: {
    unoptimized: true,
  },
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
  serverExternalPackages: ['pdf-parse', '@xenova/transformers', 'onnxruntime-node', 'sharp'],
  experimental: {
    serverActions: {
      allowedOrigins: ["sistema.maccell.com.ar", "localhost:3000"],
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
