import { beforeEach, describe, expect, it, vi } from "vitest";

const saved: Record<string, { nume?: string; email?: string }> = {};
vi.mock("./audit-engine", () => ({ runAudit: vi.fn(async () => ({ domain: "shop.ro", scor: 70 })) }));
vi.mock("./leads-store", () => ({
  saveAudit: vi.fn(async (rec: { id: string; nume?: string; email?: string }) => { saved[rec.id] = rec; }),
  getAudit: vi.fn(async () => undefined),
}));

describe("audit job persistence", () => {
  beforeEach(() => { for (const k of Object.keys(saved)) delete saved[k]; });

  it("saves a finished audit even when the visitor never sends the contact", async () => {
    const { startJob } = await import("./audit-store");
    const id = startJob("https://shop.ro");
    await vi.waitFor(() => expect(saved[id]).toBeDefined());
    expect(saved[id].email).toBeUndefined();
  });

  it("completes the same record when the contact arrives after the audit", async () => {
    const { startJob, finalizeJob } = await import("./audit-store");
    const id = startJob("https://shop.ro");
    await vi.waitFor(() => expect(saved[id]).toBeDefined());
    await finalizeJob(id, { nume: "Ana", email: "ana@shop.ro" });
    expect(saved[id]).toMatchObject({ nume: "Ana", email: "ana@shop.ro" });
    expect(Object.keys(saved)).toEqual([id]);
  });
});
