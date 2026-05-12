import type { NextConfig } from "next";

// GitHub Pages static export configuration
// Note: Dynamic routes ([id]) are skipped in static export
// They will be unavailable in the GitHub Pages demo but work fine in development
const nextConfig: NextConfig = {
  output: "export",
  basePath: "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
