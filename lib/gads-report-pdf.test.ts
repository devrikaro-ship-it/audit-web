import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveChromePath } from "./gads-report-pdf";

const originalPath = process.env.PATH;

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.CHROME_PATH;
});

describe("resolveChromePath", () => {
  it("finds Chromium from PATH when it is outside the standard system directories", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "gads-chromium-path-"));
    const executable = path.join(directory, "chromium");
    await writeFile(executable, "#!/bin/sh\n", "utf8");
    await chmod(executable, 0o755);
    process.env.PATH = directory;

    expect(resolveChromePath()).toBe(executable);
  });
});
