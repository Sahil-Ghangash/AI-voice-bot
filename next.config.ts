import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['api.groq.com'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource'
    });
    return config;
  }
};

export default nextConfig;
