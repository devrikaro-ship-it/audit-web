"use client";

// Raportul de migrare pentru un audit deja rulat. Spec: docs/MIGRARE-SPEC.md.
// Stratul de migrare se colecteaza DUPA auditul rece (PageSpeed ia pana la 40 s), deci
// pagina face polling: auditul poate fi "done" iar cazul inca in lucru.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MigrareReportRenderer } from "@/components/migrare-report-renderer";
import type { AuditData } from "@/lib/types";

const POLL_MS = 4000;
const POLL_MAX = 30; // ~2 minute: crawl + PageSpeed cu cache rece

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg,#f0f4ff,#f0fafa)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center space-y-5">{children}</div>
    </div>
  );
}

export default function MigrarePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let tries = 0;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/audit?id=${id}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.status === "error") { setError(json.error ?? "Auditul nu a putut fi finalizat."); return; }

        // Cazul e gata doar cand avem SI dovezile de platforma SI calculul.
        if (json.data?.platformEvidence && json.data?.shopifyCase) {
          setData(json.data); setWaiting(false); return;
        }
        // Auditul s-a terminat, dar nu e candidat de migrare (ex: deja pe Shopify).
        if (json.status === "done" && json.data && !json.data.platformEvidence && tries > 8) {
          setError("Magazinul nu ruleaza pe o platforma pentru care sa aiba sens acest raport.");
          return;
        }
        if (++tries > POLL_MAX) { setError("Analiza dureaza mai mult decat de obicei. Reincarca pagina in cateva minute."); return; }
        setTimeout(poll, POLL_MS);
      } catch {
        if (!cancelled) setError("Nu s-a putut incarca raportul.");
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-gray-900">Raportul de platforma nu e disponibil</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <Link href={`/r/${id}`} className="inline-flex items-center justify-center w-full py-4 rounded-xl text-white font-bold"
          style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
          Vezi auditul complet
        </Link>
      </Centered>
    );
  }

  if (waiting || !data?.platformEvidence || !data?.shopifyCase) {
    return (
      <Centered>
        <div className="w-12 h-12 border-4 border-[#47499E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600">Masuram viteza reala si stiva magazinului...</p>
        <p className="text-xs text-gray-400">Dureaza pana la doua minute.</p>
      </Centered>
    );
  }

  return <MigrareReportRenderer domain={data.domain} evidence={data.platformEvidence} shopifyCase={data.shopifyCase} />;
}
