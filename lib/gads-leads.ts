import { promises as fs } from "node:fs";
import path from "node:path";

// Lead-urile din auditul de Google Ads pe cont conectat. Fisier separat de `leads-store`
// (auditul de site), pentru ca forma datelor e alta: acolo url+scor, aici cont+marja.
// Acelasi tipar de persistenta: volum durabil + scriere serializata prin fisier temporar,
// ca un redeploy sau doua cereri simultane sa nu lase fisierul rupt la mijloc.
//
// NU salvam refresh token-ul. Accesul ne trebuie doar cat ruleaza auditul; pastrat degeaba,
// ar fi o raspundere fara niciun castig.

export type GadsLead = {
  id: string;
  createdAt: number;
  nume: string;
  email: string;
  telefon?: string;
  customerId?: string;
  customerName?: string;
  marginPct?: number;
};

const FILE = process.env.GADS_LEADS_FILE
  || path.join(path.dirname(process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "gads-leads.json");

declare global {
  var __gadsLeads: GadsLead[] | undefined;
  var __gadsLeadsWrite: Promise<void> | undefined;
}

async function load(): Promise<GadsLead[]> {
  if (global.__gadsLeads) return global.__gadsLeads;
  try {
    global.__gadsLeads = JSON.parse(await fs.readFile(FILE, "utf8")) as GadsLead[];
  } catch {
    global.__gadsLeads = [];
  }
  return global.__gadsLeads;
}

async function persist(): Promise<void> {
  const data = global.__gadsLeads!;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export async function saveLead(rec: Omit<GadsLead, "id" | "createdAt">): Promise<GadsLead> {
  const lead: GadsLead = {
    ...rec,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const list = await load();
  list.unshift(lead);
  global.__gadsLeadsWrite = (global.__gadsLeadsWrite ?? Promise.resolve()).then(persist, persist);
  await global.__gadsLeadsWrite;
  return lead;
}

/**
 * Varianta care nu arunca. Pagina de raport are nevoie sa STIE daca lead-ul s-a salvat, ca sa
 * nu-i spuna omului "am notat" cand de fapt nu a notat nimeni. Daca scrierea pica, lead-ul
 * pleaca in log-ul serverului — de acolo se poate recupera manual, ceea ce e infinit mai bine
 * decat sa dispara.
 */
export async function saveLeadSafe(rec: Omit<GadsLead, "id" | "createdAt">): Promise<{ ok: boolean }> {
  try {
    await saveLead(rec);
    return { ok: true };
  } catch (e) {
    console.error("[gads-lead] SALVARE ESUATA — lead recuperabil din linia asta:", JSON.stringify(rec), e);
    return { ok: false };
  }
}

export async function listLeads(): Promise<GadsLead[]> {
  return [...(await load())].sort((a, b) => b.createdAt - a.createdAt);
}
