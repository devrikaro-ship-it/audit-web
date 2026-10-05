// One way to read and write the app's JSON files (spec 2026-10-05 §6), with the strongest guarantees any store had:
// a write lands whole or not at all, writers in one process are serialized, writers in two processes take a lock, and
// a file that is not valid JSON stops the write instead of being read as empty and overwritten.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export class StorageCorruptError extends Error {
  constructor(readonly file: string, cause: unknown) {
    super(`Stored file is not valid JSON: ${file}`, { cause });
  }
}

const code = (error: unknown) => (error as NodeJS.ErrnoException).code;

export async function readJson<T>(file: string, empty: T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (code(error) === "ENOENT") return empty;
    throw error;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new StorageCorruptError(file, error);
  }
}

export async function writeJsonAtomic(file: string, value: unknown, mode = 0o600): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, "wx", mode);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temporary, file);
}

export async function withFileLock<T>(
  file: string,
  operation: () => Promise<T>,
  { timeoutMs = 5_000, staleMs = 30_000 }: { timeoutMs?: number; staleMs?: number } = {},
): Promise<T> {
  const lock = `${file}.lock`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      await fs.mkdir(lock, { mode: 0o700 });
      break;
    } catch (error) {
      if (code(error) !== "EEXIST") throw error;
      let stats;
      try {
        stats = await fs.stat(lock);
      } catch (inspection) {
        if (code(inspection) === "ENOENT") continue;
        throw inspection;
      }
      if (Date.now() - stats.mtimeMs > staleMs) {
        await fs.rm(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out acquiring the storage lock for ${file}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  try {
    return await operation();
  } finally {
    await fs.rm(lock, { recursive: true, force: true });
  }
}

export function jsonStore<T>(file: string, empty: () => T) {
  let chain: Promise<unknown> = Promise.resolve();
  return {
    read: () => readJson(file, empty()),
    update<R>(change: (current: T) => { next: T; result: R }): Promise<R> {
      const run = () => withFileLock(file, async () => {
        const { next, result } = change(await readJson(file, empty()));
        await writeJsonAtomic(file, next);
        return result;
      });
      const done = chain.then(run, run);
      chain = done.catch(() => undefined);
      return done;
    },
  };
}
