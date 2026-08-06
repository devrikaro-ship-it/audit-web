"use client";

import { useState } from "react";
import { C, sora, brandGradient } from "@/lib/theme";

// Sliderul care raspunde in timp real cu ROAS-ul minim. Momentul "aha" al fluxului: omul
// misca marja si vede cum se schimba pragul sub care fiecare vanzare il costa bani.
// Calculul e acelasi ca in motor (100 / marja) — tinut aici ca sa fie instantaneu, fara tur
// la server la fiecare pixel.

export default function MarginForm({
  initial,
  action,
}: {
  initial: number;
  action: (formData: FormData) => void;
}) {
  const [pct, setPct] = useState(initial);
  const roas = 100 / pct;

  return (
    <form action={action}>
      <input type="hidden" name="marginPct" value={pct} />

      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor="marja" className="text-[14px] font-semibold" style={{ color: "#334155" }}>
          Marja ta bruta
        </label>
        <output htmlFor="marja" className="text-[26px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>
          {pct}%
        </output>
      </div>

      <input
        id="marja"
        name="marjaSlider"
        type="range"
        min={5}
        max={90}
        step={1}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        className="mb-1 w-full cursor-pointer"
        style={{ accentColor: C.indigo, minHeight: 44 }}
        aria-describedby="prag"
      />
      <div className="mb-6 flex justify-between text-[12px]" style={{ color: C.gray400 }}>
        <span>5% (electronice, volum mare)</span>
        <span>90% (servicii, digital)</span>
      </div>

      <div id="prag" aria-live="polite" className="mb-7 rounded-xl px-5 py-4 text-center" style={{ background: "#f0f4ff" }}>
        <p className="mb-1 text-[13px]" style={{ color: C.gray600 }}>
          Cu marja asta, ROAS-ul tau minim este
        </p>
        <p className="mb-1.5 text-[34px] font-black leading-none tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>
          {roas.toFixed(2)}×
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: C.gray600 }}>
          Adica fiecare leu cheltuit pe reclame trebuie sa aduca inapoi cel putin{" "}
          <b style={{ color: "#0f172a" }}>{roas.toFixed(2)} lei</b> in vanzari. Sub atat, vinzi in pierdere.
        </p>
      </div>

      <button
        type="submit"
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] px-8 py-[15px] text-[16px] font-bold text-white transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        style={{ background: brandGradient, boxShadow: "0 8px 24px rgba(71,73,158,0.28)", outlineColor: C.indigo }}
      >
        Vezi ce pierzi acum
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
