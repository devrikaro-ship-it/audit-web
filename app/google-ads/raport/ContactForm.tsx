"use client";

import { useState } from "react";
import { C, sora, brandGradient } from "@/lib/theme";
import type { ContactResult } from "./actions";

export default function ContactForm({ action, reportSnapshot }: { action: (formData: FormData) => Promise<ContactResult>; reportSnapshot: string }) {
  const [status, setStatus] = useState<"READY" | "SENDING" | "SENT" | "SAVED" | "FAILED">("READY");

  if (status === "SENT" || status === "SAVED") {
    return <p className="rounded-xl px-5 py-4 text-[14.5px]" style={{ background: C.greenBg, color: C.green }}>
      {status === "SENT" ? "Your PDF report was generated, saved, and sent by email." : "Your PDF report was generated and saved. Email delivery is delayed; your report remains available to our team."}
    </p>;
  }

  return <form action={async (formData) => {
    setStatus("SENDING");
    const result = await action(formData);
    if (!result.ok) setStatus("FAILED");
    else setStatus(result.deliveryStatus === "EMAIL_SENT" ? "SENT" : "SAVED");
  }} className="flex flex-col gap-3">
    <input type="hidden" name="reportSnapshot" value={reportSnapshot} />
    {status === "FAILED" && <p className="rounded-xl px-5 py-4 text-[14px]" style={{ background: C.redBg, color: C.red }}>We could not generate the PDF. Please check the fields and try again.</p>}
    <div className="flex flex-col gap-3 sm:flex-row">
      <Field label="Name" name="name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" />
    </div>
    <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
    <label className="flex items-start gap-2 text-left text-xs leading-relaxed" style={{ color: C.gray500 }}>
      <input name="reportConsent" value="yes" type="checkbox" required className="mt-0.5 h-4 w-4" />
      I agree that Devrika may use these details to generate, store, and email this audit report. This does not subscribe me to marketing messages.
    </label>
    <button type="submit" disabled={status === "SENDING"} className="mt-1 flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] px-8 py-[14px] text-[15.5px] font-bold text-white disabled:cursor-wait disabled:opacity-70" style={{ background: brandGradient, fontFamily: sora }}>
      {status === "SENDING" ? "Generating your PDF…" : "Email my PDF report"}
    </button>
  </form>;
}

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete: string }) {
  return <label className="flex-1"><span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>{label}</span><input name={name} type={type} required autoComplete={autoComplete} className="w-full rounded-xl border px-4 text-[15px]" style={{ borderColor: "#e2e8f0", minHeight: 44 }} /></label>;
}
