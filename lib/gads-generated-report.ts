import { createHash, createHmac } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { saveOrGetReportLead, type GadsLead } from "./gads-leads";
import { openReportSnapshot, type GadsReportSnapshot } from "./gads-report-delivery";
import { saveStoredReportSnapshot, reportStorageDirectory } from "./gads-report-snapshot";
import { unseal } from "./gads-session";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

export type GeneratedReportIdentity = {
  reportId: string;
  reportToken: string;
  portalToken: string;
};

export type PersistedGeneratedReport = GeneratedReportIdentity & {
  lead: GadsLead;
  snapshotPath: string;
  managerPath: string;
};

type RecoveryRecord = {
  version: 1;
  snapshotDigest: string;
  snapshotBytes: number;
  state: "READY" | "DELIVERING" | "COMPLETED" | "CORRUPT";
};

function signingSecret(): string {
  const value = process.env.GADS_REPORT_SIGNING_SECRET || process.env.GADS_SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("GADS_REPORT_SIGNING_SECRET is required");
    }
    return "development-report-signing-secret";
  }
  return value;
}

function snapshotDigest(signedSnapshot: string | Buffer): string {
  return createHash("sha256").update(signedSnapshot).digest("hex");
}

export function generatedReportIdentity(digest: string): GeneratedReportIdentity {
  if (!DIGEST_PATTERN.test(digest)) throw new Error("Generated report digest is invalid");
  const token = (purpose: "report" | "portal") => createHmac("sha256", signingSecret())
    .update(`generated-report:${purpose}:${digest}`)
    .digest("base64url");
  return {
    reportId: `generated-${digest}`,
    reportToken: token("report"),
    portalToken: token("portal"),
  };
}

function assertSnapshotSessionBinding(
  snapshot: GadsReportSnapshot,
  session: NonNullable<ReturnType<typeof unseal>>,
): void {
  const accountName = session.customerName || "Your account";
  const exactFinancials = snapshot.averageOrderValue === session.averageOrderValue
    && snapshot.goodsCost === session.goodsCost
    && snapshot.breakEvenCpa === session.breakEvenCpa
    && snapshot.breakEvenRoas === session.breakEvenRoas;
  if (snapshot.website !== (session.website ?? "")
    || snapshot.accountName !== accountName
    || !exactFinancials) {
    throw new Error("Signed report snapshot does not belong to this session");
  }
}

async function persistOpenedSnapshot(input: {
  signedSnapshot: string;
  snapshot: GadsReportSnapshot;
  customerId?: string;
  customerName?: string;
  marginPct?: number;
}): Promise<PersistedGeneratedReport> {
  const digest = snapshotDigest(input.signedSnapshot);
  const identity = generatedReportIdentity(digest);
  const snapshotPath = await saveStoredReportSnapshot(identity.reportId, input.signedSnapshot);
  const lead = await saveOrGetReportLead({
    nume: "",
    email: "",
    customerId: input.customerId,
    customerName: input.customerName,
    marginPct: input.marginPct,
    website: input.snapshot.website,
    averageOrderValue: input.snapshot.averageOrderValue,
    goodsCost: input.snapshot.goodsCost,
    breakEvenCpa: input.snapshot.breakEvenCpa,
    breakEvenRoas: input.snapshot.breakEvenRoas,
    ...identity,
    snapshotPath,
  });
  return {
    ...identity,
    lead,
    snapshotPath,
    managerPath: `/dashboard/google-ads/reports/${lead.id}`,
  };
}

export async function persistGeneratedReport(input: {
  signedSnapshot: string;
  sealedSession: string;
}): Promise<PersistedGeneratedReport> {
  const session = unseal(input.sealedSession);
  if (!session || !session.customerId) throw new Error("Generated report session is invalid");
  const snapshot = openReportSnapshot(input.signedSnapshot);
  if (!snapshot) throw new Error("Signed generated report snapshot is invalid");
  assertSnapshotSessionBinding(snapshot, session);
  return persistOpenedSnapshot({
    signedSnapshot: input.signedSnapshot,
    snapshot,
    customerId: session.customerId,
    customerName: session.customerName,
    marginPct: session.marginPct,
  });
}

function validRecoveryRecord(value: unknown): value is RecoveryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<RecoveryRecord>;
  return record.version === 1
    && typeof record.snapshotDigest === "string"
    && DIGEST_PATTERN.test(record.snapshotDigest)
    && Number.isSafeInteger(record.snapshotBytes)
    && Number(record.snapshotBytes) > 0
    && ["READY", "DELIVERING", "COMPLETED", "CORRUPT"].includes(String(record.state));
}

async function resolveRecoveryDirectory(pendingDirectory: string): Promise<string> {
  const pendingRoot = await realpath(path.join(reportStorageDirectory(), "pending"));
  const target = await realpath(pendingDirectory);
  if (path.dirname(target) !== pendingRoot || !DIGEST_PATTERN.test(path.basename(target))) {
    throw new Error("Pending recovery directory is outside the canonical storage root");
  }
  return target;
}

export async function recoverPendingGeneratedReport(input: {
  pendingDirectory: string;
  expectedSnapshotDigest: string;
  expectedWebsite: string;
  expectedAccountName: string;
  customerId?: string;
}): Promise<PersistedGeneratedReport> {
  if (!DIGEST_PATTERN.test(input.expectedSnapshotDigest)) {
    throw new Error("Expected pending snapshot digest is invalid");
  }
  const directory = await resolveRecoveryDirectory(input.pendingDirectory);
  let record: RecoveryRecord;
  try {
    const value: unknown = JSON.parse(await readFile(path.join(directory, "record.json"), "utf8"));
    if (!validRecoveryRecord(value)) throw new Error("invalid metadata");
    record = value;
  } catch {
    throw new Error("Pending recovery metadata failed integrity validation");
  }
  if (record.state === "CORRUPT") throw new Error("Pending recovery metadata failed integrity validation");
  if (record.snapshotDigest !== input.expectedSnapshotDigest) {
    throw new Error("Pending recovery snapshot digest does not match the expected digest");
  }
  const bytes = await readFile(path.join(directory, "snapshot"));
  const signedSnapshot = bytes.toString("utf8");
  if (bytes.byteLength !== record.snapshotBytes
    || snapshotDigest(bytes) !== record.snapshotDigest) {
    throw new Error("Pending recovery snapshot failed integrity validation");
  }
  const snapshot = openReportSnapshot(signedSnapshot);
  if (!snapshot) throw new Error("Pending recovery snapshot signature is invalid");
  if (snapshot.website !== input.expectedWebsite || snapshot.accountName !== input.expectedAccountName) {
    throw new Error("Pending recovery snapshot does not match the expected identity");
  }
  return persistOpenedSnapshot({
    signedSnapshot,
    snapshot,
    customerId: input.customerId,
    customerName: input.expectedAccountName,
  });
}
