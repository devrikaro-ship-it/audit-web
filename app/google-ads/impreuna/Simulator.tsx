"use client";

import { useState } from "react";
import { C, sora } from "@/lib/theme";
import { proiectie } from "@/lib/calc";

// Ce vede prospectul cand apasa "Cu Devrika" la capatul raportului.
//
// REGULA: aici nu intra nimic din bucatariile noastre — nici grila de preturi, nici cat ne
// ramane noua. Onorariul si procentul sunt campuri GOALE, pe care le completeaza el din oferta
// primita. Restul cifrelor vin din contul lui.
//
// A doua regula, mostenita din calculatorul de ofertare: cresterea NU e o cifra afirmata de noi.
// Se exprima prin CPC in scadere si conversie in crestere, se poate trage pana la zero, iar
// ROAS-ul rezulta din ele. Cifra vedeta e PRAGUL — cat trebuie sa creasca rezultatul ca sa ne
// acoperim costul — nu profitul promis.

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} RON`;

export default function Simulator({
  bugetLunar,
  roasAzi,
  marjaPct,
}: {
  bugetLunar: number;
  roasAzi: number;
  marjaPct: number;
}) {
  const [cpc, setCpc] = useState(20);
  const [conv, setConv] = useState(20);
  const [fee, setFee] = useState("");
  const [comision, setComision] = useState("");
  const [buget, setBuget] = useState(String(bugetLunar));

  const numar = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  // Bugetul e singura cifra din cont pe care are sens sa o miste: un onorariu fix apasa altfel
  // pe 6.000 de lei decat pe 12.000. Daca sterge campul, ramanem pe cifra reala, nu pe zero.
  const bugetFolosit = numar(buget) > 0 ? numar(buget) : bugetLunar;
  const bugetSchimbat = Math.round(bugetFolosit) !== Math.round(bugetLunar);

  const p = proiectie({
    bugetLunar: bugetFolosit,
    roasAzi,
    marjaPct,
    cpcScadePct: cpc,
    convCrestePct: conv,
    feeRon: numar(fee),
    comisionPct: numar(comision),
  });

  const arePret = numar(fee) > 0 || numar(comision) > 0;
  const crestere = p.crestereNecesaraPct;
  const ipoteza = p.roasNou !== null && roasAzi > 0 ? (p.roasNou / roasAzi - 1) * 100 : 0;
  const acopera = crestere !== null && ipoteza >= crestere;

  return (
    <div className="flex flex-col gap-6">
      {/* Cifra vedeta: pragul, nu profitul */}
      <div className="rounded-2xl p-7 text-center text-white" style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#47499E 100%)" }}>
        <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[2px]" style={{ color: "rgba(255,255,255,0.75)" }}>
          {arePret ? "Cat trebuie sa creasca rezultatul reclamelor" : "Completeaza pretul din oferta ca sa vezi pragul"}
        </p>
        <p className="mb-2 font-black leading-none tabular-nums" style={{ fontFamily: sora, fontSize: "clamp(34px,7vw,56px)" }}>
          {arePret && crestere !== null ? `+${crestere.toFixed(0)}%` : "—"}
        </p>
        <p className="text-[14.5px]" style={{ color: "rgba(255,255,255,0.9)" }}>
          {arePret && crestere !== null
            ? "Atat e nevoie ca sa iesi pe acelasi profit ca acum. Peste atat, diferenta e a ta."
            : p.motivPrag ?? "Onorariul si procentul sunt cele din oferta pe care ai primit-o."}
        </p>
      </div>

      {/* Ipoteza — doua cursoare, nu o promisiune */}
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: C.border }}>
        <h2 className="mb-1 text-[16px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
          Ce facem concret la reclame
        </h2>
        <p className="mb-5 text-[13.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Nu iti spunem „creste ROAS-ul". Iti spunem ce doua lucruri lucram — clicuri mai ieftine si
          mai multe comenzi din acelasi trafic — iar ROAS-ul iese din ele. Trage cursoarele la cat
          crezi tu, inclusiv la zero.
        </p>

        <Cursor eticheta="Cost pe clic, in scadere" valoare={cpc} set={setCpc} />
        <Cursor eticheta="Rata de conversie, in crestere" valoare={conv} set={setConv} />

        <label className="mt-1 block">
          <span className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13.5px] font-semibold" style={{ color: "#334155" }}>
              Buget de reclame pe luna (RON)
            </span>
            {bugetSchimbat ? (
              <button type="button" onClick={() => setBuget(String(bugetLunar))}
                className="text-[12.5px] font-semibold underline" style={{ color: C.indigo }}>
                inapoi la cat cheltui acum ({lei(bugetLunar)})
              </button>
            ) : (
              <span className="text-[12.5px]" style={{ color: C.gray400 }}>
                atat cheltui acum, citit din cont
              </span>
            )}
          </span>
          <input value={buget} onChange={(e) => setBuget(e.target.value)} inputMode="decimal"
            placeholder={String(bugetLunar)}
            className="w-full rounded-xl border px-4 text-[15px]"
            style={{ borderColor: "#e2e8f0", minHeight: 44 }} />
        </label>

        <p className="mt-4 rounded-xl px-4 py-3 text-[13.5px]" style={{ background: C.slate, color: C.gray600 }}>
          Asta inseamna un randament al reclamelor de la <b>{roasAzi.toFixed(2)}x</b> la{" "}
          <b>{(p.roasNou ?? roasAzi).toFixed(2)}x</b> — adica <b>+{ipoteza.toFixed(0)}%</b>.
        </p>
      </div>

      {/* Pretul din oferta — completat de el */}
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: C.border }}>
        <h2 className="mb-1 text-[16px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
          Pretul din oferta ta
        </h2>
        <p className="mb-5 text-[13.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Scrie aici cifrele din oferta pe care ai primit-o, ca sa vezi calculul pe banii tai.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>Onorariu lunar (RON)</span>
            <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" placeholder="0"
              className="w-full rounded-xl border px-4 text-[15px]" style={{ borderColor: "#e2e8f0", minHeight: 44 }} />
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#334155" }}>Comision din vanzari (%)</span>
            <input value={comision} onChange={(e) => setComision(e.target.value)} inputMode="decimal" placeholder="0"
              className="w-full rounded-xl border px-4 text-[15px]" style={{ borderColor: "#e2e8f0", minHeight: 44 }} />
          </label>
        </div>
      </div>

      {/* Comparatia */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border sm:grid-cols-2"
        style={{ borderColor: C.border, background: C.border }}>
        <Coloana
          titlu="Acum"
          randuri={[
            ["Buget de reclame", lei(bugetFolosit)],
            ["Vanzari din reclame", lei(p.venitAcum)],
            ["Iti ramane pe luna", p.profitAcum === null ? "—" : lei(p.profitAcum)],
            ["Platesti agentiei", "—"],
          ]}
        />
        <Coloana
          titlu="Cu Devrika"
          accent
          randuri={[
            ["Buget de reclame", lei(bugetFolosit)],
            ["Vanzari din reclame", lei(p.venitCu)],
            ["Iti ramane pe luna", p.profitCu === null ? "—" : lei(p.profitCu)],
            ["Platesti agentiei", arePret ? lei(p.plataDevrika) : "—"],
          ]}
        />
      </div>

      {arePret && crestere !== null && (
        <p className="rounded-xl px-5 py-4 text-[13.5px] leading-relaxed"
          style={{ background: acopera ? C.greenBg : C.yellowBg, color: acopera ? C.green : C.yellow }}>
          {acopera
            ? `Ipoteza de mai sus (+${ipoteza.toFixed(0)}%) trece peste pragul de +${crestere.toFixed(0)}%, deci in scenariul asta colaborarea se plateste singura si ramane si peste.`
            : `Ipoteza de mai sus (+${ipoteza.toFixed(0)}%) e sub pragul de +${crestere.toFixed(0)}%. Pe cifrele astea, pretul din oferta nu se acopera din crestere — e o discutie de purtat, nu o cifra de ascuns.`}
        </p>
      )}

      <p className="text-[12.5px] leading-relaxed" style={{ color: C.gray400 }}>
        <b>SIMULARE.</b> Randamentul si marja sunt cifrele tale reale, citite din cont
        {bugetSchimbat
          ? `, iar bugetul e cel pus de tine aici (acum cheltui ${lei(bugetLunar)} pe luna)`
          : ", la fel si bugetul"}.
        Cresterea e o ipoteza pe care o misti tu, nu o promisiune. Profitul de aici e inainte de
        salarii, chirii si celelalte costuri ale magazinului.
      </p>
    </div>
  );
}

function Cursor({ eticheta, valoare, set }: { eticheta: string; valoare: number; set: (n: number) => void }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 flex items-baseline justify-between">
        <span className="text-[13.5px] font-semibold" style={{ color: "#334155" }}>{eticheta}</span>
        <span className="text-[15px] font-black tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>{valoare}%</span>
      </span>
      <input type="range" min={0} max={40} step={1} value={valoare}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full" style={{ accentColor: C.indigo }} />
    </label>
  );
}

function Coloana({ titlu, randuri, accent }: { titlu: string; randuri: [string, string][]; accent?: boolean }) {
  return (
    <div className="bg-white p-6">
      <p className="mb-4 text-[12px] font-extrabold uppercase tracking-[1.5px]"
        style={{ color: accent ? C.indigo : C.gray400 }}>{titlu}</p>
      <dl className="flex flex-col gap-3">
        {randuri.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-[13.5px]" style={{ color: C.gray500 }}>{k}</dt>
            <dd className="text-[15px] font-bold tabular-nums" style={{ fontFamily: sora, color: accent ? "#0f172a" : C.gray600 }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
