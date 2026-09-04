import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type GadsLead = {
  id: string;
  createdAt: number;
  nume: string;
  email: string;
  telefon?: string;
  customerId?: string;
  customerName?: string;
  marginPct?: number;
  website?: string;
  averageOrderValue?: number;
  goodsCost?: number;
  breakEvenCpa?: number;
  breakEvenRoas?: number;
  reportId?: string;
  reportToken?: string;
  portalToken?: string;
  pdfPath?: string;
  snapshotPath?: string;
  emailMessageId?: string;
  deliveryStatus?: "NEW_LEAD" | "PDF_READY" | "PDF_FAILED" | "EMAIL_SENT" | "EMAIL_FAILED";
  consentAt?: number;
  serviceReportsEnabled?: boolean;
  serviceReportsConsentAt?: number;
  serviceTermsVersion?: string;
};

const FILE = process.env.GADS_LEADS_FILE
  || path.join(path.dirname(process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "gads-leads.json");
const LOCK = `${FILE}.lock`;

declare global {
  var __gadsLeads: GadsLead[] | undefined;
  var __gadsLeadsWrite: Promise<void> | undefined;
}

async function load(): Promise<GadsLead[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as GadsLead[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

async function persist(data: GadsLead[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const temporary = `${FILE}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(data, null, 2), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temporary, FILE);
}

async function acquireLock(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      await fs.mkdir(LOCK, { mode: 0o700 });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let lockStats;
      try {
        lockStats = await fs.stat(LOCK);
      } catch (inspectionError) {
        if ((inspectionError as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw inspectionError;
      }
      const age = Date.now() - lockStats.mtimeMs;
      if (age > 30_000) {
        await fs.rm(LOCK, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error("Timed out acquiring Google Ads lead storage lock");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  await acquireLock();
  try {
    return await operation();
  } finally {
    await fs.rm(LOCK, { recursive: true, force: true });
  }
}

function createLead(rec: Omit<GadsLead, "id" | "createdAt">): GadsLead {
  return {
    ...rec,
    id: randomUUID(),
    createdAt: Date.now(),
  };
}

export async function saveLead(rec: Omit<GadsLead, "id" | "createdAt">): Promise<GadsLead> {
  return withLock(async () => {
    const list = await load();
    const lead = createLead(rec);
    list.unshift(lead);
    await persist(list);
    return lead;
  });
}

const IMMUTABLE_REPORT_FIELDS = [
  "nume",
  "email",
  "telefon",
  "customerId",
  "customerName",
  "website",
  "reportToken",
] as const;

export async function saveOrGetReportLead(
  rec: Omit<GadsLead, "id" | "createdAt"> & { reportId: string; reportToken: string },
): Promise<GadsLead> {
  return withLock(async () => {
    const list = await load();
    const existing = list.find((lead) => lead.reportId === rec.reportId);
    if (existing) {
      const matches = IMMUTABLE_REPORT_FIELDS.every((field) => existing[field] === rec[field]);
      if (!matches) throw new Error("Existing report lead conflicts with immutable delivery data");
      return existing;
    }
    const normalizedEmail = rec.email.trim().toLowerCase();
    const reusedPortalToken = list.find((lead) =>
      lead.email.trim().toLowerCase() === normalizedEmail
      && lead.customerId === rec.customerId
      && typeof lead.portalToken === "string"
    )?.portalToken;
    const lead = createLead({ ...rec, portalToken: reusedPortalToken ?? rec.portalToken });
    list.unshift(lead);
    await persist(list);
    return lead;
  });
}

export async function saveLeadSafe(rec: Omit<GadsLead, "id" | "createdAt">): Promise<{ ok: boolean }> {
  try {
    await saveLead(rec);
    return { ok: true };
  } catch (error) {
    console.error("[gads-lead] SAVE FAILED — lead recoverable from this log line:", JSON.stringify(rec), error);
    return { ok: false };
  }
}

export async function listLeads(): Promise<GadsLead[]> {
  return (await load()).sort((left, right) => right.createdAt - left.createdAt);
}

export async function updateLead(id: string, patch: Partial<GadsLead>): Promise<GadsLead | null> {
  return withLock(async () => {
    const list = await load();
    const index = list.findIndex((lead) => lead.id === id);
    if (index < 0) return null;
    list[index] = { ...list[index], ...patch, id: list[index].id, createdAt: list[index].createdAt };
    await persist(list);
    return list[index];
  });
}

export async function getLead(id: string): Promise<GadsLead | null> {
  return (await load()).find((lead) => lead.id === id) ?? null;
}

export async function findPortalToken(email: string, customerId?: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const match = (await load()).find((lead) =>
    lead.email.trim().toLowerCase() === normalizedEmail
    && lead.customerId === customerId
    && typeof lead.portalToken === "string"
  );
  return match?.portalToken ?? null;
}

export async function listPortalReports(portalToken: string): Promise<GadsLead[]> {
  if (!portalToken) return [];
  return (await listLeads()).filter((lead) => lead.portalToken === portalToken && lead.reportId);
}
