import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: For GitHub Pages static deployment, set output: 'export' and disable API routes
  // For dynamic deployment (Vercel), remove 'output' config or set to 'standalone'
  // Default: standalone for Vercel/Node.js deployment (supports both static pages and dynamic APIs)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
