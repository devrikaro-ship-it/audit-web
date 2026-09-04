import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// Lead-ul e cel mai scump lucru din tot fluxul: omul a conectat contul, a vazut raportul si
// abia atunci si-a lasat datele. Daca scrierea pica, tacerea e cel mai rau raspuns posibil.

const rec = { nume: "Ion Popescu", email: "ion@magazin.ro", telefon: "0722000111" };

function fisierNou() {
  process.env.GADS_LEADS_FILE = path.join(os.tmpdir(), `gads-leads-test-${Date.now()}-${Math.random()}.json`);
}

describe("salvarea lead-ului din auditul de Google Ads", () => {
  beforeEach(() => {
    vi.resetModules();
    global.__gadsLeads = undefined;
    global.__gadsLeadsWrite = undefined;
    fisierNou();
  });

  it("scrie lead-ul si confirma reusita", async () => {
    const { saveLeadSafe, listLeads, updateLead, findPortalToken } = await import("./gads-leads");
    expect(await saveLeadSafe(rec)).toEqual({ ok: true });
    const lista = await listLeads();
    expect(lista[0].email).toBe("ion@magazin.ro");
    await updateLead(lista[0].id, { deliveryStatus: "PDF_READY", reportId: "report-1" });
    expect((await listLeads())[0]).toMatchObject({ deliveryStatus: "PDF_READY", reportId: "report-1" });
    expect(await findPortalToken("ion@magazin.ro", undefined)).toBeNull();
  });

  it("reuses the portal token only for the same email and Google Ads account", async () => {
    const { saveLead, findPortalToken } = await import("./gads-leads");
    await saveLead({ ...rec, customerId: "111", portalToken: "portal-one" });
    await saveLead({ ...rec, email: "other@magazin.ro", customerId: "111", portalToken: "portal-two" });

    await expect(findPortalToken("ION@MAGAZIN.RO", "111")).resolves.toBe("portal-one");
    await expect(findPortalToken("ion@magazin.ro", "222")).resolves.toBeNull();
  });

  it("lists only reports owned by the requested portal token", async () => {
    const { saveLead, listPortalReports } = await import("./gads-leads");
    await saveLead({ ...rec, portalToken: "portal-one", reportId: "report-one" });
    await saveLead({ ...rec, email: "other@magazin.ro", portalToken: "portal-two", reportId: "report-two" });
    await saveLead({ ...rec, portalToken: "portal-one" });

    const reports = await listPortalReports("portal-one");
    expect(reports).toHaveLength(1);
    expect(reports[0].reportId).toBe("report-one");
    await expect(listPortalReports("unknown-portal")).resolves.toEqual([]);
  });

  it("retries only when an existing lock disappears before inspection", async () => {
    const file = process.env.GADS_LEADS_FILE!;
    const lock = `${file}.lock`;
    await fs.mkdir(lock, { recursive: true });
    const actualStat = fs.stat.bind(fs);
    const inspectionError = Object.assign(new Error("lock inspection denied"), { code: "EACCES" });
    let releaseBeforeInspection = true;
    const statSpy = vi.spyOn(fs, "stat").mockImplementation((async (target: Parameters<typeof fs.stat>[0]) => {
      if (target === lock) {
        if (releaseBeforeInspection) {
          releaseBeforeInspection = false;
          await fs.rm(lock, { recursive: true, force: true });
          return actualStat(target);
        }
        throw inspectionError;
      }
      return actualStat(target);
    }) as typeof fs.stat);

    try {
      const { saveLead } = await import("./gads-leads");
      await expect(saveLead({ ...rec, email: "race@example.com" }))
        .resolves.toMatchObject({ email: "race@example.com" });

      await fs.mkdir(lock, { recursive: true });
      await expect(saveLead({ ...rec, email: "denied@example.com" }))
        .rejects.toBe(inspectionError);
    } finally {
      statSpy.mockRestore();
      await fs.rm(lock, { recursive: true, force: true });
    }
  });

  it("creates one stable report lead across isolated concurrent module contexts", async () => {
    const input = {
      ...rec,
      customerId: "111",
      customerName: "Example Store",
      website: "https://store.example/",
      reportId: "stable-report",
      reportToken: "stable-report-token",
      portalToken: "new-portal-token",
      deliveryStatus: "NEW_LEAD" as const,
    };
    const firstModule = await import("./gads-leads");
    vi.resetModules();
    const secondModule = await import("./gads-leads");

    const [first, second] = await Promise.all([
      firstModule.saveOrGetReportLead(input),
      secondModule.saveOrGetReportLead(input),
    ]);

    expect(first.id).toBe(second.id);
    expect((await secondModule.listLeads()).filter((lead) => lead.reportId === "stable-report"))
      .toHaveLength(1);
  });

  it("rejects changed immutable data for an existing report identity", async () => {
    const { saveOrGetReportLead } = await import("./gads-leads");
    const input = {
      ...rec,
      customerId: "111",
      reportId: "stable-report",
      reportToken: "stable-report-token",
      portalToken: "portal-token",
    };
    await saveOrGetReportLead(input);
    await expect(saveOrGetReportLead({ ...input, email: "changed@example.com" }))
      .rejects.toThrow("conflicts");
  });

  it("cand scrierea pica, raporteaza esecul si lasa lead-ul in log", async () => {
    vi.doMock("node:fs", () => ({
      promises: {
        readFile: async () => { throw new Error("nu exista"); },
        mkdir: async () => undefined,
        writeFile: async () => { throw new Error("disc plin"); },
        rename: async () => undefined,
      },
    }));
    const { saveLeadSafe } = await import("./gads-leads");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveLeadSafe(rec)).toEqual({ ok: false });

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls[0])).toContain("ion@magazin.ro");
    log.mockRestore();
  });
});
