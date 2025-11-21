import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark packages that should be externalized for server bundles
  // This ensures @blocknote/xl-ai is available at runtime in serverless environments
  // without being statically analyzed by Turbopack
  serverExternalPackages: ["@blocknote/xl-ai"],
  
  // Configure webpack for when --webpack flag is used
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude React-related packages from server bundles when they're imported by @blocknote/xl-ai
      // This prevents the "swr" import error in server-side code
      const originalExternals = config.externals || [];
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        // Exclude React dependencies that cause issues in server bundles
        ({ request }: { request: string }) => {
          if (request === "swr" || request === "@ai-sdk/react") {
            return true;
          }
          return false;
        },
      ];
    }
    return config;
  },
  
  // Add empty turbopack config to silence warnings when Turbopack is used
  // The dynamic import + serverExternalPackages handles the React dependency issue
  turbopack: {},
};

export default nextConfig;
