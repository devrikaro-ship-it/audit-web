import { describe, it, expect } from "vitest";
import { parseAuditRequest } from "./audit-request";

describe("parseAuditRequest", () => {
  it("body invalid -> eroare 400", () => {
    expect(parseAuditRequest(null)).toMatchObject({ kind: "error", status: 400 });
    expect(parseAuditRequest("x")).toMatchObject({ kind: "error", status: 400 });
  });

  it("start: cere url", () => {
    expect(parseAuditRequest({ phase: "start" })).toMatchObject({ kind: "error", status: 400 });
    const r = parseAuditRequest({ phase: "start", url: "veryfix.ro", tipBusiness: "magazin" });
    expect(r).toMatchObject({ kind: "start", url: "veryfix.ro" });
    if (r.kind === "start") expect(r.meta.finalizeRequested).toBe(false);
  });

  it("finalize: cere id si pastreaza contactul", () => {
    expect(parseAuditRequest({ phase: "finalize" })).toMatchObject({ kind: "error", status: 400 });
    const r = parseAuditRequest({ phase: "finalize", id: "abc", nume: "Ion", email: "i@i.ro", probleme: ["Nu apar organic in Google"] });
    expect(r).toMatchObject({ kind: "finalize", id: "abc", input: { nume: "Ion", email: "i@i.ro", probleme: ["Nu apar organic in Google"] } });
  });

  it("finalize: ads inputs sent by an old client are not kept", () => {
    const r = parseAuditRequest({ phase: "finalize", id: "x", aov: "55", adBudget: "1500", convRate: "1,5", currency: "RON" });
    expect(r.kind === "finalize" && Object.keys(r.input).some((k) => ["aov", "adBudget", "convRate", "currency"].includes(k))).toBe(false);
  });

  it("legacy (fara phase, cu contact) -> start cu finalizeRequested=true", () => {
    const r = parseAuditRequest({ url: "veryfix.ro", nume: "Ion", email: "i@i.ro" });
    expect(r.kind).toBe("start");
    if (r.kind === "start") expect(r.meta.finalizeRequested).toBe(true);
  });
});
