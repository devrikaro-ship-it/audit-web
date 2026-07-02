import { WARM_CLIENTS } from "@/lib/warm-clients";
import { listWarmReports } from "@/lib/warm-report";

export const dynamic = "force-dynamic";

const C = {
  navy: "#13163A", indigo: "#47499E", cyan: "#0ABECF", slate: "#F4F6FB",
  green: "#1A7A4A", orange: "#D45B00", red: "#C0392B",
  gray400: "#8FA3C0", gray500: "#64748b", gray600: "#4A5E7A", gray800: "#1E2D42", border: "#E6EBF4",
};
const sora = "var(--font-sora), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

type CardState = "bun" | "mediu" | "slab";
type CardChannel = { name: string; state: CardState; verdict: string; signal: string };
type Card = {
  slug: string; client: string; vertical: string; date: string; verdict: string;
  cpa: string; troas: string; aov: string; channels: CardChannel[]; report: string;
};
const stateColor = (s: CardState) => (s === "bun" ? C.green : s === "mediu" ? C.orange : C.red);
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "");

function Tabs({ active }: { active: "rece" | "cald" }) {
  const base: React.CSSProperties = { fontFamily: sora, fontSize: 13.5, fontWeight: 700, padding: "9px 18px", borderRadius: 10, textDecoration: "none" };
  const on: React.CSSProperties = { ...base, background: "#fff", color: C.navy };
  const off: React.CSSProperties = { ...base, background: "rgba(255,255,255,0.08)", color: "#C7D2E8", border: "1px solid rgba(255,255,255,0.14)" };
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <a href="/dashboard" style={active === "rece" ? on : off}>Audituri site (rece)</a>
      <a href="/dashboard/cald" style={active === "cald" ? on : off}>Clienti cu acces (cald)</a>
    </div>
  );
}

export default async function WarmDashboardPage() {
  // rapoarte din store (generate de skill via /api/cald) + cele legacy (HTML pre-randat)
  const stored = await listWarmReports();
  const fromStore: Card[] = stored.map((r) => ({
    slug: r.slug, client: r.client, vertical: r.vertical ?? "", date: r.date, verdict: stripHtml(r.verdict),
    cpa: r.targets?.cpa ?? "—", troas: r.targets?.troas ?? "—", aov: r.targets?.aov ?? "—",
    channels: r.channels.map((ch) => ({ name: ch.name, state: ch.state, verdict: ch.verdict, signal: ch.note ?? (ch.kpis[0]?.v ?? "") })),
    report: `/cald/${r.slug}`,
  }));
  const legacy: Card[] = WARM_CLIENTS.map((c) => ({
    slug: c.slug, client: c.client, vertical: c.vertical, date: c.date, verdict: c.verdict,
    cpa: c.cpa, troas: c.troas, aov: c.aov,
    channels: c.channels.map((ch) => ({ name: ch.name, state: ch.state, verdict: ch.verdict, signal: ch.signal })),
    report: c.report,
  }));
  const seen = new Set(fromStore.map((c) => c.slug));
  const clients: Card[] = [...fromStore, ...legacy.filter((c) => !seen.has(c.slug))];

  return (
    <div style={{ fontFamily: inter, background: C.slate, minHeight: "100vh" }}>
      <header style={{ background: `radial-gradient(120% 120% at 50% -30%, #23265F 0%, ${C.navy} 60%)`, color: "#fff", padding: "28px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{ fontFamily: sora, fontWeight: 800, letterSpacing: "0.18em", fontSize: 14, color: C.cyan }}>DEVRIKA</span>
              <h1 style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, margin: "4px 0 0" }}>Dashboard audituri</h1>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
              <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: C.cyan }}>{clients.length}</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>clienti cu acces</div>
            </div>
          </div>
          <Tabs active="cald" />
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
        <p style={{ color: C.gray500, fontSize: 14, margin: "0 0 22px" }}>
          Clienti la care avem acces in conturi (Google Ads · Meta · GA4). Audit pe date reale, evaluat vs standardul Devrika.
        </p>

        {clients.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center", color: C.gray500 }}>
            Niciun client cald inca.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 18 }}>
            {clients.map((c) => (
              <div key={c.slug} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, boxShadow: "0 6px 24px rgba(19,22,58,0.05)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <h2 style={{ fontFamily: sora, fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 }}>{c.client}</h2>
                    <div style={{ fontSize: 13, color: C.gray500, marginTop: 2 }}>{c.vertical}</div>
                  </div>
                  <span style={{ fontSize: 12, color: C.gray400, whiteSpace: "nowrap" }}>{c.date}</span>
                </div>

                <p style={{ fontSize: 13.5, color: C.gray600, lineHeight: 1.5, margin: "14px 0 16px" }}>{c.verdict}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[{ v: c.cpa, l: "CPA target" }, { v: c.troas, l: "tROAS" }, { v: c.aov, l: "AOV (GA4)" }].map((t) => (
                    <div key={t.l} style={{ background: C.slate, borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                      <div style={{ fontFamily: sora, fontSize: 16, fontWeight: 800, color: C.indigo }}>{t.v}</div>
                      <div style={{ fontSize: 10.5, color: C.gray500, marginTop: 1 }}>{t.l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                  {c.channels.map((ch) => (
                    <div key={ch.name} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: `1px solid ${C.border}`, borderRadius: 11, padding: "10px 12px" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: stateColor(ch.state), marginTop: 5, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: sora, fontWeight: 700, fontSize: 13.5, color: C.gray800 }}>{ch.name}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: stateColor(ch.state), textTransform: "uppercase", letterSpacing: "0.03em" }}>{ch.verdict}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: C.gray600, lineHeight: 1.45, marginTop: 2 }}>{ch.signal}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <a href={c.report} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop: "auto", textAlign: "center", background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, color: "#fff", fontFamily: sora, fontWeight: 700, fontSize: 13.5, padding: "11px 14px", borderRadius: 11, textDecoration: "none" }}>
                  Vezi raportul complet
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
