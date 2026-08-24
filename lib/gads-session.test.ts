// LANG: pending full translation to EN
import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { seal, unseal, SESSION_MAX_AGE } from "./gads-session";

// Cookie-ul asta poarta refresh token-ul prospectului. Daca semnatura poate fi falsificata,
// cineva isi poate fabrica o sesiune. Testele apara exact asta.

beforeAll(() => {
  process.env.GADS_SESSION_SECRET = "secret-de-test";
});

const signedSession = (session: Record<string, unknown>) => {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", "secret-de-test").update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

describe("sesiunea prospectului", () => {
  it("dus-intors pastreaza datele", () => {
    const s = unseal(seal({
      refreshToken: "rt-123",
      customerId: "999",
      customerTimeZone: "Europe/Bucharest",
      marginPct: 28,
    }));
    expect(s?.refreshToken).toBe("rt-123");
    expect(s?.customerId).toBe("999");
    expect(s?.customerTimeZone).toBe("Europe/Bucharest");
    expect(s?.marginPct).toBe(28);
  });

  it("preserves valid decimal margins and refuses invalid margins before signing", () => {
    expect(unseal(seal({ refreshToken: "rt-123", marginPct: 28.5 }))?.marginPct).toBe(28.5);
    for (const marginPct of [0, 0.5, 99.5, 100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => seal({ refreshToken: "rt-123", marginPct })).toThrow(RangeError);
    }
  });

  it("removes invalid margins from previously signed sessions", () => {
    for (const marginPct of ["margin", 0, 0.5, 99.5, 100, null]) {
      const raw = signedSession({ refreshToken: "rt-123", marginPct, exp: 9e9 });
      expect(unseal(raw)?.marginPct).toBeUndefined();
    }
  });

  it("respinge un cookie cu continut modificat", () => {
    const raw = seal({ refreshToken: "rt-123" });
    const [payload, sig] = raw.split(".");
    const fake = Buffer.from(JSON.stringify({ refreshToken: "al-meu", exp: 9e9 })).toString("base64url");
    expect(unseal(`${fake}.${sig}`)).toBeNull();
    expect(unseal(`${payload}.semnatura-inventata`)).toBeNull();
  });

  it("respinge gunoi si valori lipsa", () => {
    expect(unseal(undefined)).toBeNull();
    expect(unseal("")).toBeNull();
    expect(unseal("fara-punct")).toBeNull();
    expect(unseal(".")).toBeNull();
  });

  it("respinge o sesiune expirata chiar daca semnatura e buna", () => {
    const raw = seal({ refreshToken: "rt-123" });
    const [payload] = raw.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(decoded.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(SESSION_MAX_AGE);
  });

  it("un cookie semnat cu alt secret nu trece", () => {
    const raw = seal({ refreshToken: "rt-123" });
    process.env.GADS_SESSION_SECRET = "alt-secret";
    expect(unseal(raw)).toBeNull();
    process.env.GADS_SESSION_SECRET = "secret-de-test";
  });

  it("nu accepta o sesiune fara refresh token", () => {
    const payload = Buffer.from(JSON.stringify({ exp: 9e9 })).toString("base64url");
    expect(unseal(`${payload}.orice`)).toBeNull();
  });
});
