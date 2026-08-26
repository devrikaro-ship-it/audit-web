"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { C, sora, brandGradient } from "@/lib/theme";
import { calculateBreakEven, OPERATING_COST_PCT } from "@/lib/gads-financials";

type Props = {
  initialAverageOrderValue: number;
  initialGoodsCost: number;
  measured: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

const money = (value: number) => `${value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
const compactMoney = (value: number) => `${value.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} RON`;
const AOV_STEP = 50;
const ACQUISITION_COST_STEP = 5;
const snapToStep = (value: number, step: number) => Math.round(value / step) * step;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div>
      <button type="submit" disabled={disabled || pending} aria-busy={pending}
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] px-8 py-[15px] text-[16px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: brandGradient }}>
        {pending ? "Construim raportul…" : "Construiește auditul meu de profitabilitate"}
      </button>
      {pending ? (
        <p role="status" className="mt-3 text-center text-[12.5px]" style={{ color: C.gray500 }}>
          Citim performanța produselor din contul tău Google Ads. Poate dura până la un minut.
        </p>
      ) : null}
    </div>
  );
}

export default function MarginForm({ initialAverageOrderValue, initialGoodsCost, measured, action }: Props) {
  const initialAov = Math.max(AOV_STEP, snapToStep(initialAverageOrderValue, AOV_STEP));
  const [averageOrderInput, setAverageOrderInput] = useState(String(initialAov));
  const initialAcquisitionCostPct = Math.round((Math.min(initialGoodsCost, initialAverageOrderValue) / initialAverageOrderValue) * 100);
  const [acquisitionCostPct, setAcquisitionCostPct] = useState(Math.min(75, Math.max(0, snapToStep(initialAcquisitionCostPct, ACQUISITION_COST_STEP))));
  const averageOrderValue = Number(averageOrderInput);
  const validAverageOrderValue = Number.isFinite(averageOrderValue) && averageOrderValue > 0;
  const goodsCost = validAverageOrderValue ? Math.round(averageOrderValue * acquisitionCostPct) / 100 : 0;
  const maximumAov = Math.max(10_000, Math.ceil(initialAverageOrderValue * 4 / AOV_STEP) * AOV_STEP);
  const financials = (() => {
    try {
      return calculateBreakEven({ averageOrderValue, goodsCost });
    } catch {
      return null;
    }
  })();

  const updateAov = (next: string) => {
    if (next === "") {
      setAverageOrderInput("");
      return;
    }
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) return;
    setAverageOrderInput(String(Math.max(1, Math.min(maximumAov, parsed))));
  };

  return (
    <form action={action} className="space-y-7">
      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="averageOrderValue" className="text-[14px] font-semibold" style={{ color: "#334155" }}>
            Valoarea medie a unei comenzi
          </label>
          <input id="averageOrderValue" name="averageOrderValue" type="number" min={AOV_STEP} max={maximumAov} step={AOV_STEP}
            value={averageOrderInput} onChange={(event) => updateAov(event.target.value)}
            onBlur={() => validAverageOrderValue && setAverageOrderInput(String(Math.max(AOV_STEP, snapToStep(averageOrderValue, AOV_STEP))))}
            aria-label="Valoarea medie a comenzii"
            className="w-36 rounded-lg border px-3 py-2 text-right font-bold tabular-nums" style={{ borderColor: C.border }} />
        </div>
        <input type="range" aria-label="Bara pentru valoarea medie a comenzii" min={AOV_STEP} max={maximumAov} step={AOV_STEP}
          value={validAverageOrderValue ? averageOrderValue : AOV_STEP} onChange={(event) => updateAov(event.target.value)}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <p className="text-[12.5px]" style={{ color: C.gray500 }}>
          {measured ? "Măsurată din conversiile Purchase din Google Ads" : "Confirmă sau ajustează această valoare"}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="acquisitionCostPct" className="max-w-[360px] text-[14px] font-semibold" style={{ color: "#334155" }}>
            Cât te costă marfa dintr-o comandă
          </label>
          <output htmlFor="acquisitionCostPct" className="min-w-20 text-right text-[24px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>
            {acquisitionCostPct}%
          </output>
        </div>
        <input id="acquisitionCostPct" type="range" aria-label="Procentul costului de achiziție" min="0" max="75" step={ACQUISITION_COST_STEP}
          value={acquisitionCostPct} onChange={(event) => setAcquisitionCostPct(Number(event.target.value))}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <input type="hidden" name="goodsCost" value={goodsCost} />
        <p className="text-[13px] leading-relaxed" style={{ color: C.gray500 }}>
          {validAverageOrderValue
            ? `La o comandă de ${compactMoney(averageOrderValue)}, tu plătești ${compactMoney(goodsCost)} pe marfă.`
            : "Introdu valoarea medie a unei comenzi pentru a calcula suma."}
        </p>
        <p className="mt-1 text-[12.5px]" style={{ color: C.gray400 }}>
          Marja brută rămasă: {financials ? financials.grossMarginPct.toFixed(0) : "—"}%
        </p>
      </section>

      <div aria-live="polite" className="rounded-xl px-5 py-4 text-center" style={{ background: financials ? "#f0f4ff" : C.redBg }}>
        {financials ? (
          <>
            <p className="text-[13px]" style={{ color: C.gray600 }}>CPA maxim pentru a nu pierde bani</p>
            <p className="text-[28px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{money(financials.breakEvenCpa)}</p>
            <p className="mt-2 text-[13px]" style={{ color: C.gray600 }}>ROAS minim pentru a nu pierde bani</p>
            <p className="text-[28px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{financials.breakEvenRoas.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×</p>
            <p className="mt-3 text-[12.5px]" style={{ color: C.gray500 }}>
              Calculul include o estimare fixă de {OPERATING_COST_PCT}% pentru costurile operaționale.
            </p>
          </>
        ) : (
          <p className="text-[13.5px] font-semibold" style={{ color: C.red }}>
            Costul produselor și costurile operaționale nu mai lasă bani disponibili pentru promovare.
          </p>
        )}
      </div>

      <SubmitButton disabled={!financials} />
    </form>
  );
}
