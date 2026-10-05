"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, sora, brandGradient } from "@/lib/theme";
import type { ContactResult } from "./actions";

export default function ContactForm({ action, pendingReportReference }: { action: (formData: FormData) => Promise<ContactResult>; pendingReportReference: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"READY" | "SENDING" | "SENT" | "SAVED" | "FAILED">("READY");
  const [portalPath, setPortalPath] = useState("");

  if (status === "SENT" || status === "SAVED") {
    return <div className="rounded-xl px-5 py-4 text-[14.5px]" style={{ background: C.greenBg, color: C.green }}>
      <p>{status === "SENT" ? "Your PDF audit has been generated, saved, and emailed to you." : "Your PDF audit has been generated and saved, but the email could not be sent."}</p>
      {portalPath && <a href={portalPath} className="mt-3 inline-flex font-bold underline">Open my dashboard</a>}
    </div>;
  }

  return <form action={async (formData) => {
    setStatus("SENDING");
    try {
      const result = await action(formData);
      if (!result.ok) setStatus("FAILED");
      else {
        setPortalPath(result.portalPath);
        setStatus(result.deliveryStatus === "EMAIL_SENT" ? "SENT" : "SAVED");
        router.push(result.portalPath);
      }
    } catch {
      setStatus("FAILED");
    }
  }} className="flex flex-col gap-3">
    <input type="hidden" name="pendingReportReference" value={pendingReportReference} />
    {status === "FAILED" && <p className="rounded-xl px-5 py-4 text-[14px]" style={{ background: C.redBg, color: C.red }}>We could not generate your PDF audit. Check your details and try again.</p>}
    <div className="flex flex-col gap-3 sm:flex-row">
      <Field label="Name" name="name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" />
    </div>
    <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
    <label className="flex items-start gap-2 text-left text-xs leading-relaxed" style={{ color: C.gray500 }}>
      <input name="reportConsent" value="yes" type="checkbox" required className="mt-0.5 h-4 w-4" />
      I agree that Devrika may use these details once to generate, store, and email this audit. This does not enroll me in monthly reports or promotional messages.
    </label>
    <button type="submit" disabled={status === "SENDING"} className="mt-1 flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] px-8 py-[14px] text-[15.5px] font-bold text-white disabled:cursor-wait disabled:opacity-70" style={{ background: brandGradient, fontFamily: sora }}>
      {status === "SENDING" ? "Generating PDF audit…" : "Email me my PDF audit"}
    </button>
  </form>;
}

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete: string }) {
  return <label className="flex-1"><span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>{label}</span><input name={name} type={type} required autoComplete={autoComplete} className="w-full rounded-xl border px-4 text-[15px]" style={{ borderColor: "#e2e8f0", minHeight: 44 }} /></label>;
}
