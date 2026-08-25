import { isIP } from "node:net";

export type GoogleAdsOAuthState = { nonce: string; website: string };

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

export function normalizeStoreWebsite(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input) return null;
  if (input.includes("://") && !/^https?:\/\//i.test(input)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const hostname = url.hostname.toLowerCase();
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      isIP(hostname) === 6 ||
      isPrivateIpv4(hostname)
    ) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function encodeOAuthState(nonce: string, website: string): string {
  return Buffer.from(JSON.stringify({ nonce, website })).toString("base64url");
}

export function decodeOAuthState(value: string): GoogleAdsOAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as Partial<GoogleAdsOAuthState>;
    const website = normalizeStoreWebsite(parsed.website);
    if (typeof parsed.nonce !== "string" || parsed.nonce.length < 8 || !website) return null;
    return { nonce: parsed.nonce, website };
  } catch {
    return null;
  }
}
