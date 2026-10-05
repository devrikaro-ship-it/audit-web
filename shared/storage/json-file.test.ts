import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { StorageCorruptError, jsonStore, readJson, withFileLock, writeJsonAtomic } from "./json-file";

let dir: string;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), "json-file-")); });

describe("json-file storage", () => {
  it("reads a missing file as the empty value", async () => {
    expect(await readJson(path.join(dir, "none.json"), [])).toEqual([]);
  });

  it("refuses a file that is not valid JSON instead of reading it as empty", async () => {
    const file = path.join(dir, "audits.json");
    await fs.writeFile(file, "[{\"id\":");
    await expect(readJson(file, [])).rejects.toBeInstanceOf(StorageCorruptError);
    const store = jsonStore<string[]>(file, () => []);
    await expect(store.update((list) => ({ next: [...list, "x"], result: null }))).rejects.toBeInstanceOf(StorageCorruptError);
    expect(await fs.readFile(file, "utf8")).toBe("[{\"id\":");
  });

  it("writes indented JSON readable only by its owner and leaves no temporary file", async () => {
    const file = path.join(dir, "sub", "a.json");
    await writeJsonAtomic(file, { a: 1 });
    expect(await fs.readFile(file, "utf8")).toBe("{\n  \"a\": 1\n}");
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
    expect(await fs.readdir(path.dirname(file))).toEqual(["a.json"]);
  });

  it("keeps every one of 50 concurrent updates", async () => {
    const store = jsonStore<number[]>(path.join(dir, "n.json"), () => []);
    await Promise.all(Array.from({ length: 50 }, (_, i) => store.update((list) => ({ next: [...list, i], result: null }))));
    expect((await store.read()).sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });

  it("takes over a lock left by a dead writer", async () => {
    const file = path.join(dir, "s.json");
    await fs.mkdir(`${file}.lock`);
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(`${file}.lock`, old, old);
    expect(await withFileLock(file, async () => "ran")).toBe("ran");
  });

  it("gives up on a live lock after the timeout", async () => {
    const file = path.join(dir, "t.json");
    await fs.mkdir(`${file}.lock`);
    await expect(withFileLock(file, async () => "ran", { timeoutMs: 50 })).rejects.toThrow("Timed out");
  });
});
