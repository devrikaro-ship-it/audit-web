"use client";

// Harta catalogului: aceleasi produse privite prin trei lentile — cate sunt, cat buget mananca,
// cat aduc inapoi. Argumentul se vede fara sa fie explicat: grupa care ocupa jumatate din al
// doilea inel si o felie din al treilea e exact locul din care pleaca banii.
//
// E componenta de client dintr-un singur motiv: comutatorul de perioada. Datele pentru toate
// ferestrele vin deja randate de pe server, deci schimbarea perioadei nu mai cere nimic de la
// Google — se intampla instant, in pagina.
//
// Ce NU apare aici, deliberat: pragul de trafic dupa care se face clasificarea. E o setare de-a
// noastra, nu o informatie de care are nevoie comerciantul. El vede grupele, nu mecanica.

import { useState } from "react";
import { C, sora } from "@/lib/theme";
import type { Segmentare } from "@/lib/gads-findings";

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

/** Cele cinci etichete, intr-un singur loc: nume, culoare si ce faci cu grupa. */
const ETICHETE = [
  {
    cheie: "heroes" as const,
    nume: "Heroes",
    culoare: "#3F4EA8",
    ce: "Au vandut destul cat sa nu mai fie discutie. Pe astea se sprijina contul, si tot aici merg banii in plus.",
  },
  {
    cheie: "sidekicks" as const,
    nume: "Sidekicks",
    culoare: "#C98A00",
    ce: "Au vandut, dar aproape nimeni nu le-a vazut. Cea mai ieftina crestere din cont: nu trebuie reparate, trebuie aratate.",
  },
  {
    cheie: "villains" as const,
    nume: "Villains",
    culoare: "#C0392B",
    ce: "Au avut trafic serios si tot nu se acopera. Aici se taie, iar banii pleaca spre primele doua grupe.",
  },
  {
    cheie: "zombies" as const,
    nume: "Zombies",
    culoare: "#5F7391",
    ce: "N-au strans destul trafic cat sa se poata spune ceva despre ele. Nu sunt produse proaste, sunt produse netestate.",
  },
  {
    cheie: "zeroZombies" as const,
    nume: "0 Zombies",
    culoare: "#A8B4C9",
    ce: "Nu au fost aratate niciodata. Nu e o problema de performanta, ci de feed sau de structura a campaniilor.",
  },
];

export default function CatalogPePerformanta({
  harti,
}: {
  harti: { eticheta: string; segmentare: Segmentare }[];
}) {
  const [ales, setAles] = useState(0);
  const h = harti[Math.min(ales, harti.length - 1)];
  const seg = h.segmentare;

  const lentile = [
    { titlu: "Produse", val: (g: Segmentare["heroes"]) => g.count, cuZeroZombies: true },
    { titlu: "Cat mananca", val: (g: Segmentare["heroes"]) => g.cost, cuZeroZombies: false },
    { titlu: "Cat aduc", val: (g: Segmentare["heroes"]) => g.valoare, cuZeroZombies: false },
  ];

  return (
    <>
      <p className="mb-4 text-[14px] leading-relaxed" style={{ color: C.gray500 }}>
        Aceleasi produse, privite in trei feluri: cate sunt, cat buget mananca si cat aduc inapoi.
        Cand o grupa ocupa mult mai mult din inelul din mijloc decat din cel din dreapta, acolo
        pleaca banii.
      </p>

      {harti.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Perioada analizata">
          {harti.map((x, i) => {
            const activ = i === Math.min(ales, harti.length - 1);
            return (
              <button
                key={x.eticheta}
                type="button"
                onClick={() => setAles(i)}
                aria-pressed={activ}
                className="min-h-9 rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-colors"
                style={{
                  fontFamily: sora,
                  borderColor: activ ? C.indigo : C.border,
                  background: activ ? C.indigo : C.white,
                  color: activ ? C.white : C.gray600,
                }}
              >
                {x.eticheta}
              </button>
            );
          })}
        </div>
      )}

      {!seg.judecabila && (
        // Fara masurare de incredere, impartirea dupa vanzari e o ipoteza. O spunem INAINTE ca
        // omul sa citeasca grupele, nu dupa.
        <div
          className="mb-5 rounded-xl border px-5 py-3.5 text-[13.5px] leading-relaxed"
          style={{ borderColor: C.border, background: C.yellowBg, color: C.yellow }}
        >
          Masurarea contului e stricata, deci impartirea de mai jos e o <b>ipoteza</b>, nu un
          verdict: se sprijina pe niste vanzari in care nu putem avea incredere. Prima reparatie e
          masurarea; dupa ea, grupele astea devin o harta pe care se poate lucra.
        </div>
      )}

      <div
        className="mb-4 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-3"
        style={{ borderColor: C.border, background: C.border }}
      >
        {lentile.map((lentila) => (
          <div key={lentila.titlu} className="bg-white px-5 py-5 text-center">
            <p
              className="mb-3 text-[12px] font-extrabold uppercase tracking-[1.2px]"
              style={{ color: C.gray500 }}
            >
              {lentila.titlu}
            </p>
            <Inel
              segmente={ETICHETE.filter((e) => lentila.cuZeroZombies || e.cheie !== "zeroZombies").map(
                (e) => ({ nume: e.nume, culoare: e.culoare, val: lentila.val(seg[e.cheie]) })
              )}
            />
          </div>
        ))}
      </div>

      <p className="mb-4 text-[12.5px] leading-relaxed" style={{ color: C.gray400 }}>
        Produsele fara nicio afisare nu au cifre de cheltuiala sau de vanzari, deci apar doar in
        primul inel.
      </p>

      <div className="mb-9 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: C.border }}>
        {ETICHETE.map((e) => {
          const g = seg[e.cheie];
          return (
            <div
              key={e.cheie}
              className="border-b px-5 py-4 last:border-b-0"
              style={{ borderColor: C.border }}
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 self-center rounded-sm"
                  style={{ background: e.culoare }}
                />
                <span className="text-[15px] font-bold" style={{ fontFamily: sora, color: C.navy }}>
                  {e.nume}
                </span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: C.gray600 }}>
                  {g.count} {g.count === 1 ? "produs" : "produse"}
                  {g.cost > 0 && ` · ${lei(g.cost)} cheltuiti`}
                  {g.valoare > 0 && ` · ${lei(g.valoare)} adusi`}
                </span>
              </div>
              <p className="text-[13.5px] leading-relaxed" style={{ color: C.gray600 }}>
                {e.ce}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Inelul unei lentile. Segmentele au 2px de pauza intre ele — lipite, doua culori vecine se
 * citesc ca una singura. O felie prea mica pentru 2px nu deseneaza nimic (ar fi un fir de praf
 * care arata a defect), dar numarul ei ramane in lista de dedesubt.
 */
function Inel({ segmente }: { segmente: { nume: string; val: number; culoare: string }[] }) {
  const total = segmente.reduce((s, x) => s + x.val, 0);
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  let parcurs = 0;

  if (total <= 0) {
    return (
      <div className="flex h-[132px] items-center justify-center text-[13px]" style={{ color: C.gray400 }}>
        fara date
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 140 140"
      className="mx-auto block h-[132px] w-[132px]"
      role="img"
      aria-label={segmente
        .map((s) => `${s.nume}: ${Math.round((s.val / total) * 100)}%`)
        .join(", ")}
    >
      {segmente.map((s) => {
        const lungime = (s.val / total) * CIRC;
        const desenata = lungime - 2;
        const offset = -parcurs;
        parcurs += lungime;
        if (desenata <= 0) return null;
        return (
          <circle
            key={s.nume}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={s.culoare}
            strokeWidth="20"
            strokeDasharray={`${desenata} ${CIRC - desenata}`}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
          />
        );
      })}
    </svg>
  );
}
