// Clienti CALZI = avem acces la conturi (Google Ads / Meta / GA4), audit pe date reale.
// Sursa: scripts/warm_report.py din skill audit-devrika; raportul full e in public/cald/<slug>.html.
// Adaugare client nou: o intrare aici + copiaza HTML-ul randat in public/cald/.

export type WarmChannel = {
  name: string;
  state: "bun" | "mediu" | "slab";
  verdict: string;
  signal: string;
};

export type WarmClient = {
  slug: string;
  client: string;
  domain: string;
  date: string;
  vertical: string;
  cpa: string;
  troas: string;
  aov: string;
  verdict: string;
  channels: WarmChannel[];
  report: string;
};

export const WARM_CLIENTS: WarmClient[] = [
  {
    slug: "modlet",
    client: "Modlet",
    domain: "modlet.ro",
    date: "30 iun 2026",
    vertical: "Incaltaminte dama",
    cpa: "20 RON",
    troas: "8",
    aov: "~165 RON",
    verdict: "Meta vinde real (GA4 confirma), Google e neexploatat. Cresterea = curatare Meta + construire Google.",
    channels: [
      { name: "Meta", state: "bun", verdict: "functioneaza", signal: "45.809 lei venit real GA4 / 90z · ROAS ~3,8 · de curatat (200 camp)" },
      { name: "Google", state: "slab", verdict: "neexploatat", signal: "1 campanie · ~4.000 lei/an · fara brand · bidding MC plain" },
    ],
    report: "/cald/modlet.html",
  },
  {
    slug: "mansarda-online",
    client: "Mansarda Online",
    domain: "mansarda-online.ro",
    date: "30 iun 2026",
    vertical: "Materiale mansarda (VELUX/FAKRO)",
    cpa: "400 RON",
    troas: "10",
    aov: "~4.000 RON",
    verdict: "Tracking poluat pe ambele canale. ROAS Meta 64 e fictiv (GA4: 0 lei). Google aduce vanzarile.",
    channels: [
      { name: "Google", state: "mediu", verdict: "de curatat", signal: "aduce vanzarile reale (GA4) · conversii poluate · 35 camp" },
      { name: "Meta", state: "slab", verdict: "ROAS fictiv", signal: "ROAS 64 raportat = 0 lei real in GA4 / 90z · pixel strain" },
    ],
    report: "/cald/mansarda-online.html",
  },
];
