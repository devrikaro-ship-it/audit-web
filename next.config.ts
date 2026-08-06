import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In productie, root-ul SERVESTE hub-ul "Audit Devrika" — locul din care pleaca toate
    // auditurile (URL ramane curat: audit.devrika.ro). Pana in august 2026 root-ul ducea
    // direct la auditul de site; acum acela e doar unul dintre audituri.
    // Root-ul e si pagina declarata ca home page in ecranul de consimtamant Google.
    // Local pastram Dev Index-ul la "/".
    if (process.env.NODE_ENV !== "production") return [];
    return { beforeFiles: [{ source: "/", destination: "/hub" }] };
  },
};

export default nextConfig;
