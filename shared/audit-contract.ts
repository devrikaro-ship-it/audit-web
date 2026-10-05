// What every audit module gives the agency dashboard (spec 2026-10-05 §5, amended by plan 4): its name, the channel
// label and filter id the dashboard shows, and its audits as prospect rows. A new audit module that exports this
// appears in the dashboard without touching it.
export type ProspectRow = {
  key: string;            // stable id for the status store: "<filter>:<id>"
  createdAt: number;
  canal: string;
  site: string;
  nume: string;
  email: string;
  telefon: string;
  observatii: { rezultat: string; preocupare: string; raport: string };
};

export type AuditModule = {
  name: string;
  channel: string;
  filter: string;
  prospects: () => Promise<ProspectRow[]>;
};
