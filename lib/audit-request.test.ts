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

  it("finalize: cere id + coerce numere din string", () => {
    expect(parseAuditRequest({ phase: "finalize" })).toMatchObject({ kind: "error", status: 400 });
    const r = parseAuditRequest({ phase: "finalize", id: "abc", aov: "55", adBudget: "1.500", convRate: "1,5" });
    expect(r.kind).toBe("finalize");
    if (r.kind === "finalize") {
      expect(r.input.aov).toBe(55);
      expect(r.input.adBudget).toBe(1.5); // "1.500" -> parseFloat 1.5 (fara separator de mii)
      expect(r.input.convRate).toBe(1.5); // virgula -> punct
    }
  });

  it("finalize: currency valid -> uppercase; invalid -> undefined", () => {
    const ok = parseAuditRequest({ phase: "finalize", id: "x", currency: "ron" });
    const bad = parseAuditRequest({ phase: "finalize", id: "x", currency: "euro" });
    const none = parseAuditRequest({ phase: "finalize", id: "x" });
    if (ok.kind === "finalize") expect(ok.input.currency).toBe("RON");
    if (bad.kind === "finalize") expect(bad.input.currency).toBeUndefined();
    if (none.kind === "finalize") expect(none.input.currency).toBeUndefined();
  });

  it("finalize: convRate gol / lipsa -> null (nu stiu)", () => {
    const a = parseAuditRequest({ phase: "finalize", id: "x", convRate: "" });
    const b = parseAuditRequest({ phase: "finalize", id: "x" });
    if (a.kind === "finalize") expect(a.input.convRate).toBeNull();
    if (b.kind === "finalize") expect(b.input.convRate).toBeNull();
  });

  it("legacy (fara phase, cu contact) -> start cu finalizeRequested=true", () => {
    const r = parseAuditRequest({ url: "veryfix.ro", nume: "Ion", email: "i@i.ro", aov: "40", adBudget: "800" });
    expect(r.kind).toBe("start");
    if (r.kind === "start") {
      expect(r.meta.finalizeRequested).toBe(true);
      expect(r.meta.aov).toBe(40);
    }
  });
});
