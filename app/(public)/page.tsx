"use client";
import Link from "next/link";

const pages = [
  { href: "/audit-seo", label: "Landing Page", desc: "Pagina publica de prezentare a tool-ului" },
  { href: "/start", label: "Funnel /start", desc: "Formularul in 5 pasi pentru audit gratuit" },
  { href: "/r/preview", label: "Raport Preview", desc: "Raportul complet cu date mock" },
  { href: "/r/37401420-cbae-4a7c-b896-08131db52c90", label: "Raport Real — diente.ro", desc: "Raport generat de engine pe date reale (16 pagini)" },
];

export default function DevIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f7ff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, padding: "0 24px" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#0ABECF", marginBottom: 8 }}>Dev Index</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: -1 }}>seo-audit</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pages.map((p) => (
            <Link key={p.href} href={p.href} style={{ display: "block", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px", textDecoration: "none", transition: "box-shadow 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(71,73,158,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#47499E", marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{p.desc}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>localhost:3001{p.href}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
