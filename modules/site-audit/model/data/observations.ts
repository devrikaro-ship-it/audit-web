// Knowledge base stage 2: one observation per finished audit, appended on the production data volume
// (docs/superpowers/specs/2026-09-23-platform-knowledge-base-design.md). Learning (stage 3) reads these.
import { promises as fs } from "node:fs";
import path from "node:path";

import type { Observation } from "@/modules/site-audit/model/observations";

const FILE = process.env.OBSERVATIONS_FILE
  || path.join(path.dirname(process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "platform-knowledge", "observations.jsonl");

let chain: Promise<void> = Promise.resolve();

export async function appendObservation(o: Observation, file = FILE): Promise<void> {
  const write = async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(o) + "\n", "utf8");
  };
  chain = chain.then(write, write);
  await chain;
}

export async function readObservations(file = FILE): Promise<Observation[]> {
  try {
    return (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).flatMap((l) => {
      try { return [JSON.parse(l) as Observation]; } catch { return []; }
    });
  } catch { return []; }
}
