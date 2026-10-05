// One website audit, step by step (spec 2026-10-05 §8): each step is a pure function of what the previous ones read,
// with the outside world passed in. kind: the visitor's correction of the kind of site; it wins over the scan.
import type { SiteKind } from "@/modules/site-audit/model/site-kind";
import type { AuditData } from "@/modules/site-audit/model/types";
import type { AuditIO, StepReport } from "@/modules/site-audit/model/steps/io";
import { readHome } from "@/modules/site-audit/model/steps/read-home";
import { readSitemaps } from "@/modules/site-audit/model/steps/read-sitemaps";
import { choosePages } from "@/modules/site-audit/model/steps/choose-pages";
import { readPages } from "@/modules/site-audit/model/steps/read-pages";
import { measure } from "@/modules/site-audit/model/steps/measure";
import { computeResults } from "@/modules/site-audit/model/steps/compute-results";
import { realAuditIO } from "@/modules/site-audit/model/data/audit-io";

export type { StepReport };

export async function runAudit(rawUrl: string, opts: { kind?: SiteKind; onStep?: StepReport } = {}, io: AuditIO = realAuditIO): Promise<AuditData> {
  const step: StepReport = (id, state, result) => { try { opts.onStep?.(id, state, result); } catch { /* the audit never depends on the screen */ } };
  const startedAt = io.now();
  const home = await readHome(rawUrl, opts.kind, io, step);
  const maps = await readSitemaps(home, step);
  const chosen = await choosePages(home, maps, io, step);
  const read = await readPages(home, maps, chosen, io, step);
  const measured = await measure(home, read, io, step);
  return computeResults(home, maps, chosen, read, measured, startedAt, io, step);
}
