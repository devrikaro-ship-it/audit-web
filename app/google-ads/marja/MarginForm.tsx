"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { C, sora, brandGradient } from "@/lib/theme";
import { calculateBreakEven, OPERATING_COST_PCT } from "@/lib/gads-financials";

type Props = {
  initialAverageOrderValue: number;
  initialGoodsCost: number;
  measured: boolean;
  currencyCode: string;
  action: (formData: FormData) => void | Promise<void>;
};

const money = (value: number, currencyCode: string) => `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
const compactMoney = (value: number, currencyCode: string) => `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currencyCode}`;
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
        {pending ? "Building your report…" : "Build my profitability audit"}
      </button>
      {pending ? (
        <p role="status" className="mt-3 text-center text-[12.5px]" style={{ color: C.gray500 }}>
          We are reading product performance from your Google Ads account. This may take up to one minute.
        </p>
      ) : null}
    </div>
  );
}

export default function MarginForm({ initialAverageOrderValue, initialGoodsCost, measured, currencyCode, action }: Props) {
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
            Average order value
          </label>
          <input id="averageOrderValue" name="averageOrderValue" type="number" min={AOV_STEP} max={maximumAov} step={AOV_STEP}
            value={averageOrderInput} onChange={(event) => updateAov(event.target.value)}
            onBlur={() => validAverageOrderValue && setAverageOrderInput(String(Math.max(AOV_STEP, snapToStep(averageOrderValue, AOV_STEP))))}
            aria-label="Average order value"
            className="w-36 rounded-lg border px-3 py-2 text-right font-bold tabular-nums" style={{ borderColor: C.border }} />
        </div>
        <input type="range" aria-label="Average order value slider" min={AOV_STEP} max={maximumAov} step={AOV_STEP}
          value={validAverageOrderValue ? averageOrderValue : AOV_STEP} onChange={(event) => updateAov(event.target.value)}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <p className="text-[12.5px]" style={{ color: C.gray500 }}>
          {measured ? "Measured from Google Ads Purchase conversions" : "Confirm or adjust this value"}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="acquisitionCostPct" className="max-w-[360px] text-[14px] font-semibold" style={{ color: "#334155" }}>
            Cost of goods per order
          </label>
          <output htmlFor="acquisitionCostPct" className="min-w-20 text-right text-[24px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>
            {acquisitionCostPct}%
          </output>
        </div>
        <input id="acquisitionCostPct" type="range" aria-label="Cost of goods percentage" min="0" max="75" step={ACQUISITION_COST_STEP}
          value={acquisitionCostPct} onChange={(event) => setAcquisitionCostPct(Number(event.target.value))}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <input type="hidden" name="goodsCost" value={goodsCost} />
        <p className="text-[13px] leading-relaxed" style={{ color: C.gray500 }}>
          {validAverageOrderValue
            ? `For a ${compactMoney(averageOrderValue, currencyCode)} order, you pay ${compactMoney(goodsCost, currencyCode)} for goods.`
            : "Enter the average order value to calculate the amount."}
        </p>
        <p className="mt-1 text-[12.5px]" style={{ color: C.gray400 }}>
          Remaining gross margin: {financials ? financials.grossMarginPct.toFixed(0) : "—"}%
        </p>
      </section>

      <div aria-live="polite" className="rounded-xl px-5 py-4 text-center" style={{ background: financials ? "#f0f4ff" : C.redBg }}>
        {financials ? (
          <>
            <p className="text-[13px]" style={{ color: C.gray600 }}>Maximum CPA to break even</p>
            <p className="text-[28px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{money(financials.breakEvenCpa, currencyCode)}</p>
            <p className="mt-2 text-[13px]" style={{ color: C.gray600 }}>Minimum ROAS to break even</p>
            <p className="text-[28px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{financials.breakEvenRoas.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×</p>
            <p className="mt-3 text-[12.5px]" style={{ color: C.gray500 }}>
              The calculation includes a fixed {OPERATING_COST_PCT}% estimate for operating costs.
            </p>
          </>
        ) : (
          <p className="text-[13.5px] font-semibold" style={{ color: C.red }}>
            Product and operating costs leave no money available for advertising.
          </p>
        )}
      </div>

      <SubmitButton disabled={!financials} />
    </form>
  );
}
