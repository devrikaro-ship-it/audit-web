import { scoreToStatus } from "@/modules/site-audit/model/scoring";
import type { CheckResult, StatusCheck } from "@/modules/site-audit/model/types";
import { UNAVAILABLE } from "@/modules/site-audit/model/copy-registry";
import type { PSIResult } from "@/modules/site-audit/model/data/net";

// ── PageSpeed scoring: fetchPSI in lib/net; aici doar maparea la status ────────

export const psiToStatus = scoreToStatus;

export function lcpToStatus(lcp: string): StatusCheck {
  const secs = parseFloat(lcp.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (isNaN(secs)) return "atentie";
  if (secs < 2.5) return "ok";
  if (secs < 4) return "atentie";
  return "critic";
}

export function clsToStatus(cls: string): StatusCheck {
  const val = parseFloat(cls.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (isNaN(val)) return "atentie";
  if (val < 0.1) return "ok";
  if (val < 0.25) return "atentie";
  return "critic";
}

export function inpToStatus(tbt: string): StatusCheck {
  const ms = parseFloat(tbt.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (isNaN(ms)) return "atentie";
  if (ms < 200) return "ok";
  if (ms < 600) return "atentie";
  return "critic";
}

export function ttfbToStatus(ms: number): StatusCheck {
  if (ms < 600) return "ok";
  if (ms < 1200) return "atentie";
  return "critic";
}

export function ttfbCheck(ttfbMs: number | null): CheckResult {
  if (ttfbMs == null) return { status: "atentie", value: "Nu s-a putut masura" };
  return { status: ttfbToStatus(ttfbMs), value: `${ttfbMs} ms` };
}

export function computeVitezaChecks(mobile: PSIResult | null, desktop: PSIResult | null, ttfbMs: number | null): Record<string, CheckResult> {
  if (!mobile && !desktop) {
    return {
      pagespeed_mobile:  { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" },
      pagespeed_desktop: { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" },
      lcp:  { status: "atentie", value: "Date indisponibile" },
      cls:  { status: "atentie", value: "Date indisponibile" },
      inp:  { status: "atentie", value: "Date indisponibile" },
      ttfb: ttfbCheck(ttfbMs),
    };
  }
  // A side PageSpeed could not measure, and any timing it did not return, stays unavailable ("de verificat").
  const unavailable: CheckResult = { status: "atentie", value: UNAVAILABLE };
  const timing = (v: string | undefined, toStatus: (x: string) => StatusCheck): CheckResult =>
    v && v !== UNAVAILABLE ? { status: toStatus(v), value: v } : unavailable;
  return {
    pagespeed_mobile:  mobile ? { status: psiToStatus(mobile.score), value: `${mobile.score} / 100` } : unavailable,
    pagespeed_desktop: desktop ? { status: psiToStatus(desktop.score), value: `${desktop.score} / 100` } : unavailable,
    lcp:  timing(mobile?.lcp, lcpToStatus),
    cls:  timing(mobile?.cls, clsToStatus),
    inp:  timing(mobile?.tbt, inpToStatus),
    ttfb: ttfbCheck(ttfbMs),
  };
}
