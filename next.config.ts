import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // In productie, root-ul = landing-ul public. Local pastram Dev Index-ul.
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/", destination: "/audit-seo", permanent: false }];
  },
};

export default nextConfig;
