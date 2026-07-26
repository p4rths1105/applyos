import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse ships a CJS deep-import that the bundler can't resolve; let Node
  // resolve it at runtime instead of bundling it.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    // Resume PDFs routinely exceed the 1MB default for server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
