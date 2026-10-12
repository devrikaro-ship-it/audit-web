import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Production serves the English hub at / on every domain reaching the app.
    // Domain-specific redirects and rewrites belong in the hosting configuration.
    // Development keeps the developer index at /.
    if (process.env.NODE_ENV !== "production") return [];
    return { beforeFiles: [{ source: "/", destination: "/hub" }] };
  },
};

export default nextConfig;
