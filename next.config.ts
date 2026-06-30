import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In productie, root-ul SERVESTE landing-ul (URL ramane curat: audit.devrika.ro,
    // fara /audit-seo in bara). Local pastram Dev Index-ul la "/".
    if (process.env.NODE_ENV !== "production") return [];
    return { beforeFiles: [{ source: "/", destination: "/audit-seo" }] };
  },
};

export default nextConfig;
