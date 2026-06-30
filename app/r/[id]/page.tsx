"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportRenderer } from "@/components/report-renderer";
import type { AuditData } from "@/lib/types";
import Link from "next/link";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f0f4ff,#f0fafa)" }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#47499E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600">Se incarca raportul...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg,#f0f4ff,#f0fafa)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center space-y-5">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900">Auditul nu a putut fi finalizat</h1>
        <p className="text-sm text-gray-500">{message}</p>
        <Link href="/start"
          className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
          Incearca din nou
        </Link>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/audit?id=${id}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.status === "done" && json.data) {
          setData(json.data);
        } else if (json.status === "error") {
          setError(json.error ?? "Eroare la procesarea auditului.");
        } else if (json.status === "pending" || json.status === "running") {
          // Still processing — redirect back to processing page
          window.location.href = `/processing/${id}`;
        } else {
          setError("Raportul nu a fost gasit sau a expirat.");
        }
      } catch {
        if (!cancelled) setError("Nu s-a putut incarca raportul.");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <ErrorScreen message={error} />;
  if (!data) return <LoadingScreen />;
  return <ReportRenderer data={data} />;
}
