import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse ships a CJS deep-import that the bundler can't resolve; let Node
  // resolve it at runtime instead of bundling it.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
