"use client";

import { useState } from "react";
import { C, sora, brandGradient } from "@/lib/theme";
import type { ContactResult } from "./actions";

export default function ContactForm({ action, reportSnapshot }: { action: (formData: FormData) => Promise<ContactResult>; reportSnapshot: string }) {
  const [status, setStatus] = useState<"READY" | "SENDING" | "SENT" | "SAVED" | "FAILED">("READY");

  if (status === "SENT" || status === "SAVED") {
    return <p className="rounded-xl px-5 py-4 text-[14.5px]" style={{ background: C.greenBg, color: C.green }}>
      {status === "SENT" ? "Raportul PDF a fost generat, salvat și trimis pe email." : "Raportul PDF a fost generat și salvat. Trimiterea pe email este întârziată, dar raportul rămâne disponibil echipei noastre."}
    </p>;
  }

  return <form action={async (formData) => {
    setStatus("SENDING");
    const result = await action(formData);
    if (!result.ok) setStatus("FAILED");
    else setStatus(result.deliveryStatus === "EMAIL_SENT" ? "SENT" : "SAVED");
  }} className="flex flex-col gap-3">
    <input type="hidden" name="reportSnapshot" value={reportSnapshot} />
    {status === "FAILED" && <p className="rounded-xl px-5 py-4 text-[14px]" style={{ background: C.redBg, color: C.red }}>Nu am putut genera raportul PDF. Verifică datele și încearcă din nou.</p>}
    <div className="flex flex-col gap-3 sm:flex-row">
      <Field label="Nume" name="name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" />
    </div>
    <Field label="Telefon" name="phone" type="tel" autoComplete="tel" />
    <label className="flex items-start gap-2 text-left text-xs leading-relaxed" style={{ color: C.gray500 }}>
      <input name="reportConsent" value="yes" type="checkbox" required className="mt-0.5 h-4 w-4" />
      Sunt de acord ca Devrika să folosească aceste date pentru a genera, salva și trimite pe email raportul de audit. Acest acord nu mă abonează la mesaje de marketing.
    </label>
    <button type="submit" disabled={status === "SENDING"} className="mt-1 flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] px-8 py-[14px] text-[15.5px] font-bold text-white disabled:cursor-wait disabled:opacity-70" style={{ background: brandGradient, fontFamily: sora }}>
      {status === "SENDING" ? "Generăm raportul PDF…" : "Trimite-mi raportul PDF pe email"}
    </button>
  </form>;
}

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete: string }) {
  return <label className="flex-1"><span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>{label}</span><input name={name} type={type} required autoComplete={autoComplete} className="w-full rounded-xl border px-4 text-[15px]" style={{ borderColor: "#e2e8f0", minHeight: 44 }} /></label>;
}
