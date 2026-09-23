import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { listStatuses, setStatus } from "./dashboard-status";

describe("dashboard status store", () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "dash-status-")), "status.json");

  it("saves a known status and reads it back", async () => {
    expect(await setStatus("site:abc-1", "Meet programat", file)).toBe(true);
    expect(await listStatuses(file)).toEqual({ "site:abc-1": "Meet programat" });
  });

  it("refuses an unknown status or a malformed key without writing", async () => {
    expect(await setStatus("site:abc-1", "Castigat", file)).toBe(false);
    expect(await setStatus("../../etc", "Client", file)).toBe(false);
    expect(await listStatuses(file)).toEqual({ "site:abc-1": "Meet programat" });
  });
});
