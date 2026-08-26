import { beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("stored Google Ads report snapshots", () => {
  beforeEach(async () => {
    process.env.GADS_REPORTS_DIR = await mkdtemp(path.join(os.tmpdir(), "gads-report-snapshots-"));
  });

  it("stores the signed snapshot outside the lead index and reads it back", async () => {
    const { saveStoredReportSnapshot, readStoredReportSnapshot } = await import("./gads-report-snapshot");
    const snapshotPath = await saveStoredReportSnapshot("report-1", "signed.snapshot");
    expect(await readFile(snapshotPath, "utf8")).toBe("signed.snapshot");
    await expect(readStoredReportSnapshot(snapshotPath)).resolves.toBe("signed.snapshot");
  });

  it("refuses report identifiers that could escape the reports directory", async () => {
    const { saveStoredReportSnapshot } = await import("./gads-report-snapshot");
    await expect(saveStoredReportSnapshot("../outside", "signed.snapshot")).rejects.toThrow("Invalid report id");
  });

  it("refuses stored snapshot paths outside the reports directory", async () => {
    const { readStoredReportSnapshot } = await import("./gads-report-snapshot");
    await expect(readStoredReportSnapshot(path.join(os.tmpdir(), "outside.snapshot"))).rejects.toThrow("Invalid snapshot path");
  });
});
