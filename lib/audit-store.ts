import type { AuditJob, AuditData } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __auditStore: Map<string, AuditJob> | undefined;
}

// Persist across hot-reloads in dev
if (!global.__auditStore) {
  global.__auditStore = new Map<string, AuditJob>();
}
const store = global.__auditStore;

export function createJob(id: string, url: string, tipBusiness?: string, platforma?: string): AuditJob {
  const job: AuditJob = { id, url, tipBusiness, platforma, status: "pending", createdAt: Date.now() };
  store.set(id, job);
  return job;
}

export function getJob(id: string): AuditJob | undefined {
  return store.get(id);
}

export function updateJob(id: string, updates: Partial<AuditJob>): void {
  const job = store.get(id);
  if (job) store.set(id, { ...job, ...updates });
}

export function setJobResult(id: string, data: AuditData): void {
  updateJob(id, { status: "done", data });
}

export function setJobError(id: string, error: string): void {
  updateJob(id, { status: "error", error });
}
