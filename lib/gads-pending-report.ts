import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { openReportSnapshot, type GadsReportSnapshot } from "./gads-report-delivery";
import { SESSION_MAX_AGE, unseal } from "./gads-session";
import { reportStorageDirectory } from "./gads-report-snapshot";

const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DEFAULT_CLAIM_LEASE_MS = 60_000;

export type PendingReportResult = {
  deliveryStatus: "EMAIL_SENT" | "EMAIL_FAILED";
  reportId: string;
  portalPath: string;
};

type PendingDeliveryIdentity = {
  submissionDigest: string;
  reportId: string;
  reportToken: string;
  portalToken: string;
};

type PendingReportRecord = {
  version: 1;
  createdAt: number;
  expiresAt: number;
  sealedSessionDigest: string;
  snapshotDigest: string;
  snapshotBytes: number;
  state: "READY" | "DELIVERING" | "COMPLETED" | "CORRUPT";
  delivery?: PendingDeliveryIdentity;
  result?: PendingReportResult;
};

type ClaimOwner = {
  ownerToken: string;
  heartbeatAt: number;
};

export type NormalizedPendingContact = {
  name: string;
  email: string;
  phone: string;
  consentVersion: string;
};

export type PendingReportClaim = {
  referenceDigest: string;
  ownerToken: string;
  directory: string;
  pendingSnapshotPath?: string;
  signedSnapshot?: string;
  snapshot?: GadsReportSnapshot;
  snapshotDigest: string;
  delivery?: PendingDeliveryIdentity;
  result?: PendingReportResult;
};

export class PendingReportError extends Error {
  constructor(
    public readonly code: "INVALID" | "EXPIRED" | "IN_PROGRESS" | "CONFLICT",
    message: string,
    public readonly sessionBound = false,
  ) {
    super(message);
    this.name = "PendingReportError";
  }
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function equalDigest(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function operationalMilliseconds(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pendingRoot(): string {
  return path.join(reportStorageDirectory(), "pending");
}

function entryDirectory(reference: string): { directory: string; referenceDigest: string } {
  if (!REFERENCE_PATTERN.test(reference)) {
    throw new PendingReportError("INVALID", "Pending report reference has an invalid shape");
  }
  const referenceDigest = digest(reference);
  return {
    referenceDigest,
    directory: path.join(pendingRoot(), referenceDigest),
  };
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeDurableFile(target: string, value: string): Promise<void> {
  const handle = await open(target, "wx", 0o600);
  try {
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeRecord(directory: string, record: PendingReportRecord): Promise<void> {
  const target = path.join(directory, "record.json");
  const temporary = path.join(directory, `.record.${process.pid}.${randomUUID()}.tmp`);
  await writeDurableFile(temporary, JSON.stringify(record));
  await rename(temporary, target);
  await syncDirectory(directory);
}

function validRecord(value: unknown): value is PendingReportRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PendingReportRecord>;
  return record.version === 1
    && Number.isSafeInteger(record.createdAt)
    && Number.isSafeInteger(record.expiresAt)
    && typeof record.sealedSessionDigest === "string"
    && /^[a-f0-9]{64}$/.test(record.sealedSessionDigest)
    && typeof record.snapshotDigest === "string"
    && /^[a-f0-9]{64}$/.test(record.snapshotDigest)
    && Number.isSafeInteger(record.snapshotBytes)
    && Number(record.snapshotBytes) > 0
    && ["READY", "DELIVERING", "COMPLETED", "CORRUPT"].includes(String(record.state));
}

async function readRecord(directory: string): Promise<PendingReportRecord> {
  try {
    const value: unknown = JSON.parse(await readFile(path.join(directory, "record.json"), "utf8"));
    if (!validRecord(value)) throw new Error("invalid metadata");
    return value;
  } catch {
    throw new PendingReportError("INVALID", "Pending report metadata is unavailable or invalid");
  }
}

function validateSession(sealedSession: string) {
  const session = unseal(sealedSession);
  if (!session) throw new PendingReportError("INVALID", "Pending report session is invalid");
  return session;
}

function assertSessionBinding(record: PendingReportRecord, sealedSession: string): void {
  if (!equalDigest(record.sealedSessionDigest, digest(sealedSession))) {
    throw new PendingReportError("INVALID", "Pending report session binding does not match");
  }
}

function claimDirectory(directory: string): string {
  return path.join(directory, "claim");
}

async function readClaimOwner(directory: string): Promise<ClaimOwner | null> {
  try {
    const value = JSON.parse(await readFile(path.join(claimDirectory(directory), "owner.json"), "utf8")) as Partial<ClaimOwner>;
    return typeof value.ownerToken === "string" && Number.isSafeInteger(value.heartbeatAt)
      ? { ownerToken: value.ownerToken, heartbeatAt: value.heartbeatAt as number }
      : null;
  } catch {
    return null;
  }
}

async function recoverStaleClaim(directory: string, now: number): Promise<boolean> {
  const claim = claimDirectory(directory);
  const owner = await readClaimOwner(directory);
  let heartbeatAt = owner?.heartbeatAt;
  if (heartbeatAt === undefined) {
    try {
      heartbeatAt = (await stat(claim)).mtimeMs;
    } catch {
      return true;
    }
  }
  const lease = operationalMilliseconds("GADS_PENDING_CLAIM_LEASE_MS", DEFAULT_CLAIM_LEASE_MS);
  if (now - heartbeatAt <= lease) return false;
  const stale = path.join(directory, `.claim-stale.${process.pid}.${randomUUID()}`);
  try {
    await rename(claim, stale);
  } catch {
    return false;
  }
  await rm(stale, { recursive: true, force: true });
  return true;
}

async function acquireClaim(directory: string, ownerToken: string, now: number): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mkdir(claimDirectory(directory), { mode: 0o700 });
      await writeDurableFile(
        path.join(claimDirectory(directory), "owner.json"),
        JSON.stringify({ ownerToken, heartbeatAt: now }),
      );
      await syncDirectory(claimDirectory(directory));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (attempt === 0 && await recoverStaleClaim(directory, now)) continue;
      throw new PendingReportError("IN_PROGRESS", "Pending report already has an active delivery", true);
    }
  }
}

async function assertClaimOwner(claim: PendingReportClaim): Promise<void> {
  const owner = await readClaimOwner(claim.directory);
  if (!owner || !equalDigest(digest(owner.ownerToken), digest(claim.ownerToken))) {
    throw new PendingReportError("IN_PROGRESS", "Pending report claim ownership was lost", true);
  }
}

function submissionDigest(contact: NormalizedPendingContact): string {
  const secret = process.env.GADS_REPORT_SIGNING_SECRET || process.env.GADS_SESSION_SECRET;
  if (!secret) throw new Error("A report signing secret is required");
  return createHmac("sha256", secret)
    .update(JSON.stringify([contact.name, contact.email, contact.phone, contact.consentVersion]))
    .digest("hex");
}

export async function stagePendingReportSnapshot(
  signedSnapshot: string,
  sealedSession: string,
): Promise<{ reference: string }> {
  const session = validateSession(sealedSession);
  const snapshot = openReportSnapshot(signedSnapshot);
  if (!snapshot) throw new PendingReportError("INVALID", "Signed report snapshot is invalid");
  if (snapshot.website !== (session.website ?? "")
    || snapshot.accountName !== (session.customerName || "Your account")) {
    throw new PendingReportError("INVALID", "Signed report snapshot does not belong to this session");
  }
  const now = Date.now();
  const ttl = operationalMilliseconds("GADS_PENDING_REPORT_TTL_MS", SESSION_MAX_AGE * 1000);
  const expiresAt = Math.min(session.exp * 1000, now + ttl);
  const root = pendingRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reference = randomBytes(32).toString("base64url");
    const { directory, referenceDigest } = entryDirectory(reference);
    const temporary = path.join(root, `.pending.${referenceDigest}.${process.pid}.${randomUUID()}`);
    await mkdir(temporary, { mode: 0o700 });
    const record: PendingReportRecord = {
      version: 1,
      createdAt: now,
      expiresAt,
      sealedSessionDigest: digest(sealedSession),
      snapshotDigest: digest(signedSnapshot),
      snapshotBytes: Buffer.byteLength(signedSnapshot),
      state: "READY",
    };
    try {
      await writeDurableFile(path.join(temporary, "snapshot"), signedSnapshot);
      await writeDurableFile(path.join(temporary, "record.json"), JSON.stringify(record));
      await syncDirectory(temporary);
      await rename(temporary, directory);
      await syncDirectory(root);
      return { reference };
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }
  throw new Error("Unable to allocate a unique pending report reference");
}

export async function claimPendingReport(
  reference: string,
  sealedSession: string,
): Promise<PendingReportClaim> {
  const session = validateSession(sealedSession);
  const { directory, referenceDigest } = entryDirectory(reference);
  const initialRecord = await readRecord(directory);
  assertSessionBinding(initialRecord, sealedSession);
  if (initialRecord.expiresAt <= Date.now()) {
    throw new PendingReportError("EXPIRED", "Pending report has expired", true);
  }
  if (initialRecord.state === "CORRUPT") {
    throw new PendingReportError("INVALID", "Pending report is corrupt", true);
  }

  const ownerToken = randomBytes(32).toString("base64url");
  await acquireClaim(directory, ownerToken, Date.now());
  const baseClaim: PendingReportClaim = {
    referenceDigest,
    ownerToken,
    directory,
    snapshotDigest: initialRecord.snapshotDigest,
  };
  try {
    const record = await readRecord(directory);
    assertSessionBinding(record, sealedSession);
    if (record.expiresAt <= Date.now()) {
      throw new PendingReportError("EXPIRED", "Pending report has expired", true);
    }
    if (record.state === "CORRUPT") {
      throw new PendingReportError("INVALID", "Pending report is corrupt", true);
    }
    if (record.state === "COMPLETED") {
      return { ...baseClaim, snapshotDigest: record.snapshotDigest, delivery: record.delivery, result: record.result };
    }

    const pendingSnapshotPath = path.join(directory, "snapshot");
    const bytes = await readFile(pendingSnapshotPath);
    const signedSnapshot = bytes.toString("utf8");
    const validLength = bytes.byteLength === record.snapshotBytes;
    const validDigest = equalDigest(digest(bytes), record.snapshotDigest);
    const snapshot = validLength && validDigest ? openReportSnapshot(signedSnapshot) : null;
    const belongsToSession = snapshot
      && snapshot.website === (session.website ?? "")
      && snapshot.accountName === (session.customerName || "Your account");
    if (!snapshot || !belongsToSession) {
      await writeRecord(directory, { ...record, state: "CORRUPT" });
      throw new PendingReportError("INVALID", "Pending report snapshot failed integrity validation", true);
    }
    await writeRecord(directory, { ...record, state: "DELIVERING" });
    return {
      ...baseClaim,
      pendingSnapshotPath,
      signedSnapshot,
      snapshot,
      snapshotDigest: record.snapshotDigest,
      delivery: record.delivery,
      result: record.result,
    };
  } catch (error) {
    await releasePendingReportClaim(baseClaim).catch(() => undefined);
    throw error;
  }
}

export async function bindPendingReportSubmission(
  claim: PendingReportClaim,
  contact: NormalizedPendingContact,
): Promise<PendingDeliveryIdentity> {
  await assertClaimOwner(claim);
  const record = await readRecord(claim.directory);
  const contactDigest = submissionDigest(contact);
  if (record.delivery) {
    if (!equalDigest(record.delivery.submissionDigest, contactDigest)) {
      throw new PendingReportError("CONFLICT", "Pending report was already bound to different contact data", true);
    }
    claim.delivery = record.delivery;
    return record.delivery;
  }
  const delivery: PendingDeliveryIdentity = {
    submissionDigest: contactDigest,
    reportId: randomUUID(),
    reportToken: randomBytes(24).toString("base64url"),
    portalToken: randomBytes(24).toString("base64url"),
  };
  await writeRecord(claim.directory, { ...record, state: "DELIVERING", delivery });
  claim.delivery = delivery;
  return delivery;
}

export async function heartbeatPendingReportClaim(claim: PendingReportClaim): Promise<void> {
  await assertClaimOwner(claim);
  const target = path.join(claimDirectory(claim.directory), "owner.json");
  const temporary = path.join(claimDirectory(claim.directory), `.owner.${process.pid}.${randomUUID()}.tmp`);
  await writeDurableFile(temporary, JSON.stringify({ ownerToken: claim.ownerToken, heartbeatAt: Date.now() }));
  await rename(temporary, target);
  await syncDirectory(claimDirectory(claim.directory));
}

export async function completePendingReport(
  claim: PendingReportClaim,
  result: PendingReportResult,
): Promise<void> {
  await assertClaimOwner(claim);
  const record = await readRecord(claim.directory);
  if (!record.delivery || record.delivery.reportId !== result.reportId) {
    throw new PendingReportError("CONFLICT", "Pending report result does not match its delivery identity", true);
  }
  if (record.result && JSON.stringify(record.result) !== JSON.stringify(result)) {
    throw new PendingReportError("CONFLICT", "Pending report already has a different completion result", true);
  }
  await writeRecord(claim.directory, { ...record, state: "COMPLETED", result });
  claim.result = result;
  await unlink(path.join(claim.directory, "snapshot")).catch((error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
  await releasePendingReportClaim(claim);
}

export async function releasePendingReportClaim(claim: PendingReportClaim): Promise<void> {
  const owner = await readClaimOwner(claim.directory);
  if (!owner || !equalDigest(digest(owner.ownerToken), digest(claim.ownerToken))) return;
  const record = await readRecord(claim.directory).catch(() => null);
  if (record && record.state === "DELIVERING" && !record.result) {
    await writeRecord(claim.directory, { ...record, state: "READY" });
  }
  await rm(claimDirectory(claim.directory), { recursive: true, force: true });
}

export async function cleanupExpiredPendingReports(
  now: number,
  limit: number,
): Promise<{ examined: number; removed: number }> {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("Cleanup limit must be a non-negative integer");
  const root = pendingRoot();
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  let examined = 0;
  let removed = 0;
  for (const entry of entries) {
    if (examined >= limit) break;
    if (!entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)) continue;
    examined += 1;
    const directory = path.join(root, entry.name);
    const record = await readRecord(directory).catch(() => null);
    if (record && record.expiresAt > now) continue;
    try {
      await stat(claimDirectory(directory));
      if (!await recoverStaleClaim(directory, now)) continue;
    } catch {
      // No live claim prevents cleanup.
    }
    await rm(directory, { recursive: true, force: true });
    removed += 1;
  }
  return { examined, removed };
}
