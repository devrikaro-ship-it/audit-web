"use client";

import { useState } from "react";
import { C, sora, brandGradient } from "@/lib/theme";
import { calculateBreakEven, OPERATING_COST_PCT } from "@/lib/gads-financials";

type Props = {
  initialAverageOrderValue: number;
  initialGoodsCost: number;
  measured: boolean;
  action: (formData: FormData) => void;
};

const money = (value: number) => `${value.toFixed(2)} RON`;

export default function MarginForm({ initialAverageOrderValue, initialGoodsCost, measured, action }: Props) {
  const [averageOrderValue, setAverageOrderValue] = useState(initialAverageOrderValue);
  const [goodsCost, setGoodsCost] = useState(Math.min(initialGoodsCost, initialAverageOrderValue));
  const maximumAov = Math.max(10_000, Math.ceil(initialAverageOrderValue * 4 / 100) * 100);
  const financials = (() => {
    try {
      return calculateBreakEven({ averageOrderValue, goodsCost });
    } catch {
      return null;
    }
  })();

  const updateAov = (next: number) => {
    const safe = Math.max(1, Math.min(maximumAov, next));
    setAverageOrderValue(safe);
    setGoodsCost((current) => Math.min(current, safe));
  };

  return (
    <form action={action} className="space-y-7">
      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="averageOrderValue" className="text-[14px] font-semibold" style={{ color: "#334155" }}>
            Average order value
          </label>
          <input id="averageOrderValue" name="averageOrderValue" type="number" min="1" max={maximumAov} step="1"
            value={averageOrderValue} onChange={(event) => updateAov(Number(event.target.value))}
            className="w-36 rounded-lg border px-3 py-2 text-right font-bold tabular-nums" style={{ borderColor: C.border }} />
        </div>
        <input type="range" aria-label="Average order value slider" min="1" max={maximumAov} step="1"
          value={averageOrderValue} onChange={(event) => updateAov(Number(event.target.value))}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <p className="text-[12.5px]" style={{ color: C.gray500 }}>
          {measured ? "Measured from Purchase conversions in Google Ads" : "Confirm or adjust this estimate"}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="goodsCost" className="text-[14px] font-semibold" style={{ color: "#334155" }}>
            Cost of goods in one average order
          </label>
          <input id="goodsCost" name="goodsCost" type="number" min="0" max={averageOrderValue} step="1"
            value={goodsCost} onChange={(event) => setGoodsCost(Math.max(0, Math.min(averageOrderValue, Number(event.target.value))))}
            className="w-36 rounded-lg border px-3 py-2 text-right font-bold tabular-nums" style={{ borderColor: C.border }} />
        </div>
        <input type="range" aria-label="Goods cost slider" min="0" max={averageOrderValue} step="1"
          value={goodsCost} onChange={(event) => setGoodsCost(Number(event.target.value))}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <p className="text-[12.5px]" style={{ color: C.gray500 }}>
          Gross margin: {financials ? financials.grossMarginPct.toFixed(1) : "0.0"}%
        </p>
      </section>

      <div aria-live="polite" className="rounded-xl px-5 py-4 text-center" style={{ background: financials ? "#f0f4ff" : C.redBg }}>
        {financials ? (
          <>
            <p className="text-[13px]" style={{ color: C.gray600 }}>Break-even CPA</p>
            <p className="text-[28px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{money(financials.breakEvenCpa)}</p>
            <p className="mt-2 text-[13px]" style={{ color: C.gray600 }}>Break-even ROAS</p>
            <p className="text-[28px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{financials.breakEvenRoas.toFixed(2)}×</p>
            <p className="mt-3 text-[12.5px]" style={{ color: C.gray500 }}>
              Includes a fixed {OPERATING_COST_PCT}% operating-cost estimate.
            </p>
          </>
        ) : (
          <p className="text-[13.5px] font-semibold" style={{ color: C.red }}>
            Product and operating costs leave no amount available for advertising.
          </p>
        )}
      </div>

      <button type="submit" disabled={!financials}
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] px-8 py-[15px] text-[16px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: brandGradient }}>
        Build my profitability audit
      </button>
    </form>
  );
}
