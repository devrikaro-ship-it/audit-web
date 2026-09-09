import { recoverPendingGeneratedReport } from "../lib/gads-pending-report";

const HELP_TEXT = `Usage:
  JITI_ALIAS='{"@":"/absolute/repository/root"}' ./node_modules/.bin/jiti scripts/recover-generated-report.ts \\
    --pending-directory <absolute-path> \\
    --expected-snapshot-digest <sha256> \\
    --expected-website <website> \\
    --expected-account-name <account-name> \\
    [--customer-id <google-ads-customer-id>]

Recover one verified pending Google Ads report without deleting or modifying its source snapshot.
`;

const VALUE_FLAGS = new Set([
  "--pending-directory",
  "--expected-snapshot-digest",
  "--expected-website",
  "--expected-account-name",
  "--customer-id",
]);

function parseArguments(values: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    if (!VALUE_FLAGS.has(flag) || !value || value.startsWith("--") || parsed.has(flag)) {
      throw new Error(`Invalid or incomplete argument: ${flag || "<missing>"}`);
    }
    parsed.set(flag, value);
  }
  return parsed;
}

function required(argumentsMap: Map<string, string>, flag: string): string {
  const value = argumentsMap.get(flag);
  if (!value) throw new Error(`Missing required argument: ${flag}`);
  return value;
}

async function main(): Promise<void> {
  const values = process.argv.slice(2);
  if (values.length === 1 && (values[0] === "--help" || values[0] === "-h")) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const argumentsMap = parseArguments(values);
  const recovered = await recoverPendingGeneratedReport({
    pendingDirectory: required(argumentsMap, "--pending-directory"),
    expectedSnapshotDigest: required(argumentsMap, "--expected-snapshot-digest"),
    expectedWebsite: required(argumentsMap, "--expected-website"),
    expectedAccountName: required(argumentsMap, "--expected-account-name"),
    customerId: argumentsMap.get("--customer-id"),
  });
  process.stdout.write(`${JSON.stringify({
    reportId: recovered.reportId,
    leadId: recovered.lead.id,
    managerPath: recovered.managerPath,
    snapshotPath: recovered.snapshotPath,
  })}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Recovery failed"}\n`);
  process.exitCode = 1;
});
