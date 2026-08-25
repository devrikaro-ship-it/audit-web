import { listLeads } from "@/lib/gads-leads";

// Al treilea tab al dashboardului: prospectii care si-au conectat contul de Google Ads.
// Fara pagina asta, lead-urile se scriau in fisier si nu le vedea nimeni — adica auditul
// aducea oameni si noi nu aflam.

export const dynamic = "force-dynamic";

const C = {
  navy: "#13163A", indigo: "#47499E", cyan: "#0ABECF", slate: "#F4F6FB",
  green: "#1A7A4A", gray400: "#8FA3C0", gray500: "#64748b", gray800: "#1E2D42", border: "#E6EBF4",
};
const sora = "var(--font-sora), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

const fmtDate = (t: number) =>
  new Date(t).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtCont = (id?: string) =>
  id ? id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : "—";

export default async function DashboardGoogleAds() {
  const leads = await listLeads();
  const cuTelefon = leads.filter((l) => l.telefon).length;
  // Cate conturi distincte s-au conectat — un om poate reveni, dar contul e unitatea reala.
  const conturi = new Set(leads.map((l) => l.customerId).filter(Boolean)).size;

  const th: React.CSSProperties = { fontFamily: sora, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.gray500, textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { fontSize: 14, color: C.gray800, padding: "14px 16px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };
  const tab = (activ: boolean): React.CSSProperties => ({
    fontFamily: sora, fontSize: 13.5, fontWeight: 700, padding: "9px 18px", borderRadius: 10, textDecoration: "none",
    background: activ ? "#fff" : "rgba(255,255,255,0.08)", color: activ ? C.navy : "#C7D2E8",
    border: activ ? "none" : "1px solid rgba(255,255,255,0.14)",
  });

  return (
    <div style={{ fontFamily: inter, background: C.slate, minHeight: "100vh" }}>
      <header style={{ background: `radial-gradient(120% 120% at 50% -30%, #23265F 0%, ${C.navy} 60%)`, color: "#fff", padding: "28px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{ fontFamily: sora, fontWeight: 800, letterSpacing: "0.18em", fontSize: 14, color: C.cyan }}>DEVRIKA</span>
              <h1 style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, margin: "4px 0 0" }}>Dashboard audituri</h1>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: C.cyan }}>{leads.length}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>lead-uri</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: "#fff" }}>{conturi}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>conturi conectate</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: "#fff" }}>{cuTelefon}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>cu telefon</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <a href="/dashboard" style={tab(false)}>Audituri site (rece)</a>
            <a href="/dashboard/cald" style={tab(false)}>Clienti cu acces (cald)</a>
            <a href="/dashboard/google-ads" style={tab(true)}>Google Ads (cont conectat)</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
        {leads.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center", color: C.gray500 }}>
            Niciun lead inca. Cand cineva isi conecteaza contul pe{" "}
            <a href="/google-ads" style={{ color: C.indigo }}>/google-ads</a> si lasa un contact, apare aici.
          </div>
        ) : (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={th}>Data</th>
                    <th style={th}>Nume</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Cont Google Ads</th>
                    <th style={th}>Marja</th>
                    <th style={th}>Prag ROAS</th>
                    <th style={th}>Livrare</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td style={{ ...td, whiteSpace: "nowrap", color: C.gray500 }}>{fmtDate(l.createdAt)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{l.nume || "—"}</td>
                      <td style={td}>
                        {l.email && (
                          <div><a href={`mailto:${l.email}`} style={{ color: C.indigo }}>{l.email}</a></div>
                        )}
                        {l.telefon && (
                          <div style={{ marginTop: 2 }}><a href={`tel:${l.telefon}`} style={{ color: C.gray800 }}>{l.telefon}</a></div>
                        )}
                        {!l.email && !l.telefon && <span style={{ color: C.gray400 }}>—</span>}
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{l.customerName || "—"}</div>
                        <div style={{ fontSize: 12.5, color: C.gray400, fontVariantNumeric: "tabular-nums" }}>{fmtCont(l.customerId)}</div>
                      </td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{l.marginPct ? `${l.marginPct}%` : "—"}</td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums", fontWeight: 700, color: C.indigo }}>
                        {l.breakEvenRoas ? `${l.breakEvenRoas.toFixed(2)}×` : "—"}
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: l.deliveryStatus === "EMAIL_SENT" ? C.green : C.gray500 }}>{l.deliveryStatus || "—"}</div>
                        {l.reportId && l.reportToken && l.pdfPath && <div style={{ marginTop: 4 }}><a href={`/api/google-ads/reports/${l.reportId}?token=${encodeURIComponent(l.reportToken)}`} target="_blank" rel="noreferrer" style={{ color: C.indigo }}>Open PDF</a></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 13, color: C.gray500, lineHeight: 1.6 }}>
          The break-even ROAS and CPA are derived from the confirmed average order value, goods cost,
          and the fixed 20% operating-cost assumption. Google Ads refresh tokens are not stored with leads.
        </p>
      </main>
    </div>
  );
}
