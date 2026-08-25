import { describe, it, expect, vi, beforeEach } from "vitest";
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
    const { saveLeadSafe, listLeads, updateLead } = await import("./gads-leads");
    expect(await saveLeadSafe(rec)).toEqual({ ok: true });
    const lista = await listLeads();
    expect(lista[0].email).toBe("ion@magazin.ro");
    await updateLead(lista[0].id, { deliveryStatus: "PDF_READY", reportId: "report-1" });
    expect((await listLeads())[0]).toMatchObject({ deliveryStatus: "PDF_READY", reportId: "report-1" });
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
