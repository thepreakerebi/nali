import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark packages that should be externalized for server bundles
  // This ensures @blocknote/xl-ai is available at runtime in serverless environments
  // without being statically analyzed by Turbopack
  // The dynamic import in the API route will load this package at runtime
  serverExternalPackages: ["@blocknote/xl-ai"],
};

export default nextConfig;
