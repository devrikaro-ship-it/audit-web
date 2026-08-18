"use client";

import { useState } from "react";
import { C, sora, brandGradient } from "@/lib/theme";

// Captura de lead vine DUPA cifra de impact, nu inainte: omul tocmai a aflat ceva despre
// afacerea lui si vrea restul. Inainte de raport, acelasi formular ar fi doar o bariera.

export default function ContactForm({ action }: { action: (fd: FormData) => Promise<{ ok: boolean } | void> }) {
  const [stare, setStare] = useState<"gata" | "trimis" | "esuat">("gata");

  if (stare === "trimis") {
    return (
      <p className="rounded-xl px-5 py-4 text-[14.5px]" style={{ background: C.greenBg, color: C.green }}>
        Am notat. Te cautam in cel mult o zi lucratoare cu raportul complet.
      </p>
    );
  }

  return (
    <form
      // "Am notat" se spune DOAR daca s-a notat. Cand salvarea pica, omul afla pe loc si are
      // alternativa la indemana — altfel lead-ul dispare si el crede ca ne-a scris.
      action={async (fd) => {
        const rez = await action(fd);
        setStare(rez && rez.ok === false ? "esuat" : "trimis");
      }}
      className="flex flex-col gap-3"
    >
      {stare === "esuat" && (
        <p className="rounded-xl px-5 py-4 text-[14px] leading-relaxed" style={{ background: C.redBg, color: C.red }}>
          Nu am putut salva datele acum. Scrie-ne direct la{" "}
          <a href="mailto:hello@devrika.ro?subject=Audit%20Google%20Ads%20-%20raport%20complet" className="font-bold underline">
            hello@devrika.ro
          </a>{" "}
          si iti trimitem raportul complet, sau incearca inca o data butonul de mai jos.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>Nume</span>
          <input name="nume" required autoComplete="name"
            className="w-full rounded-xl border px-4 text-[15px]"
            style={{ borderColor: "#e2e8f0", minHeight: 44 }} />
        </label>
        <label className="flex-1">
          <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>Email</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email"
            className="w-full rounded-xl border px-4 text-[15px]"
            style={{ borderColor: "#e2e8f0", minHeight: 44 }} />
        </label>
      </div>
      <label>
        <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>Telefon</span>
        <input name="telefon" type="tel" autoComplete="tel" inputMode="tel"
          className="w-full rounded-xl border px-4 text-[15px]"
          style={{ borderColor: "#e2e8f0", minHeight: 44 }} />
      </label>
      <button type="submit"
        className="mt-1 flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] px-8 py-[14px] text-[15.5px] font-bold text-white transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        style={{ background: brandGradient, fontFamily: sora, outlineColor: C.indigo }}>
        Trimite-mi raportul complet
      </button>
    </form>
  );
}
