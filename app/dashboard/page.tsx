import { listAudits } from "@/lib/leads-store";

export const dynamic = "force-dynamic";

const C = {
  navy: "#13163A", indigo: "#47499E", cyan: "#0ABECF", slate: "#F4F6FB",
  green: "#1A7A4A", orange: "#D45B00", red: "#C0392B",
  gray400: "#8FA3C0", gray500: "#64748b", gray800: "#1E2D42", border: "#E6EBF4",
};
const sora = "var(--font-sora), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";
function scoreColor(s: number) { return s >= 70 ? C.green : s >= 40 ? C.orange : C.red; }
function fmtDate(t: number) {
  return new Date(t).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  const audits = await listAudits();
  const cuContact = audits.filter(a => a.email || a.telefon).length;

  const th: React.CSSProperties = { fontFamily: sora, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.gray500, textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { fontSize: 14, color: C.gray800, padding: "14px 16px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };

  return (
    <div style={{ fontFamily: inter, background: C.slate, minHeight: "100vh" }}>
      <header style={{ background: `radial-gradient(120% 120% at 50% -30%, #23265F 0%, ${C.navy} 60%)`, color: "#fff", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontFamily: sora, fontWeight: 800, letterSpacing: "0.18em", fontSize: 14, color: C.cyan }}>DEVRIKA</span>
            <h1 style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, margin: "4px 0 0" }}>Dashboard audituri</h1>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
              <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: C.cyan }}>{audits.length}</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>audituri</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
              <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: "#fff" }}>{cuContact}</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>cu contact</div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
        {audits.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center", color: C.gray500 }}>
            Niciun audit inca. Cand cineva completeaza funnel-ul, apare aici.
          </div>
        ) : (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 24px rgba(19,22,58,0.05)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Data</th>
                    <th style={th}>Site</th>
                    <th style={{ ...th, textAlign: "center" }}>Scor</th>
                    <th style={th}>Nume</th>
                    <th style={th}>Email</th>
                    <th style={th}>Telefon</th>
                    <th style={th}>Business</th>
                    <th style={th}>Raport</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map(a => (
                    <tr key={a.id}>
                      <td style={{ ...td, color: C.gray500, whiteSpace: "nowrap" }}>{fmtDate(a.createdAt)}</td>
                      <td style={td}>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: C.indigo, fontWeight: 600, textDecoration: "none" }}>{a.domain}</a>
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 16, color: scoreColor(a.scor) }}>{a.scor}</span>
                      </td>
                      <td style={td}>{a.nume || <span style={{ color: C.gray400 }}>—</span>}</td>
                      <td style={td}>{a.email ? <a href={`mailto:${a.email}`} style={{ color: C.gray800, textDecoration: "none" }}>{a.email}</a> : <span style={{ color: C.gray400 }}>—</span>}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{a.telefon ? <a href={`tel:${a.telefon}`} style={{ color: C.gray800, textDecoration: "none" }}>{a.telefon}</a> : <span style={{ color: C.gray400 }}>—</span>}</td>
                      <td style={{ ...td, color: C.gray500 }}>{a.tipBusiness || "—"}{a.platforma ? ` · ${a.platforma}` : ""}</td>
                      <td style={td}>
                        <a href={`/r/${a.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-block", background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, color: "#fff", fontFamily: sora, fontWeight: 700, fontSize: 12.5, padding: "7px 14px", borderRadius: 9, textDecoration: "none", whiteSpace: "nowrap" }}>
                          Vezi raport
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
