"use client";
import { useState, useTransition } from "react";
import { LEAD_STATUSES } from "@/lib/dashboard-rows";
import { updateLeadStatus } from "./actions";

export default function StatusSelect({ rowKey, status }: { rowKey: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <select
      aria-label="Status"
      className={`status${failed ? " failed" : ""}`}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const previous = value;
        setValue(next);
        start(async () => {
          const r = await updateLeadStatus(rowKey, next).catch(() => ({ ok: false }));
          if (!r.ok) { setValue(previous); setFailed(true); } else setFailed(false);
        });
      }}
    >
      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
