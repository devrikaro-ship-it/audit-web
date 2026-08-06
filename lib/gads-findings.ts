// Traduce rezultatul brut al auditului in GRESELI, fiecare cu banii pe care ii costa ACUM.
// Asta e stratul care face diferenta intre un tabel de cifre si un raport pe care un om
// il citeste si intelege ce pierde.
//
// Regula centrala: cand masurarea e stricata NU tacem, pentru ca tacerea ar ascunde cea mai
// scumpa greseala din cont. Spunem raspicat ca TOT bugetul se cheltuie orb — asta e masurat
// (suma e reala, defectul e real) — si carantinam DOAR judecata "produsul X nu vinde", care
// chiar depinde de conversii. Produsele moarte raman valide oricum: zero afisari inseamna
// zero afisari, indiferent daca stii sau nu sa numeri vanzarile.

import type { AuditResult } from "./gads-audit";
import type { TrackingState } from "./gads-tracking";
import type { StructuraAudit } from "./gads-structure";
import type { KeywordAudit } from "./gads-keywords";
import type { PmaxAudit } from "./gads-pmax";
import type { ShoppingAudit } from "./gads-shopping";

/** Cele trei niveluri de onestitate. Nu se amesteca niciodata. */
export type Tier = "MASURAT" | "ESTIMARE" | "SIMULARE";

/** Un rand din tabelul de produse afisat sub un finding. */
export type RandProdus = {
  titlu: string;
  cost: number;
  /** Lipseste cand masurarea e stricta — atunci nu avem ce ROAS afisa. */
  roas?: number;
};

export type Finding = {
  /** Cheie stabila, pentru testare si pentru randare. */
  key: string;
  title: string;
  /** Banii in joc. Ordonarea raportului se face dupa acest camp, descrescator. */
  ron: number;
  tier: Tier;
  /** Text pentru un decident netehnic: ce se intampla, de ce, ce inseamna pentru el. */
  body: string;
  /** Findings care spun "asta nu se poate judeca acum" — se afiseaza, dar fara acuzatie. */
  quarantined?: boolean;
  /**
   * Produsele concrete din spatele cifrei. Fara ele, raportul spune "29 de produse iti ard
   * bani" si omul ramane exact cu intrebarea cu care a venit: CARE. Asta e informatia pentru
   * care si-a conectat contul.
   */
  produse?: RandProdus[];
  /** Cate au ramas nearatate, cand lista e taiata. Se spune pe fata, nu se ascunde. */
  produseRestante?: number;
  /**
   * Findings masurate pe alta fereastra decat restul raportului (12 luni). Nu intra in cifra
   * mare — un cost pe 30 de zile adunat la unul pe 12 luni da un total pe care nu-l poti apara.
   */
  exclusDinTotal?: boolean;
  /** Termenii de cautare care au ars banii, cand asta e natura constatarii. */
  termeni?: { termen: string; cost: number; clicuri: number }[];
  termeniRestanti?: number;
};

/** Cate produse aratam in tabel. Peste atat, raportul devine listing, nu concluzie. */
const MAX_PRODUSE = 10;

/**
 * Un punct de atac: o setare gresita in cont. Se tine SEPARAT de findings pentru ca banii de
 * aici sunt de alta natura — nu "pierduti", ci "trecuti printr-o setare gresita". Daca i-am
 * aduna in acelasi total cu risipa masurata, am umfla cifra mare a raportului cu bani care in
 * parte chiar au adus vanzari, iar prima obiectie a oricarui om cu experienta ar darama tot.
 */
export type PunctDeAtac = {
  cod: string;
  titlu: string;
  /** Bugetul care trece prin setarea gresita. 0 cand problema nu are o suma atasata. */
  ron: number;
  detaliu: string;
  grad: "critic" | "costa" | "reglaj";
  /** Produsele blocate / termenii care ard bani — dovada concreta sub afirmatie. */
  exemple?: string[];
};

export type ReportModel = {
  headline: { ron: number; label: string };
  trackingBroken: boolean;
  findings: Finding[];
  /** Setarile de reparat, in ordinea impactului. */
  puncte: PunctDeAtac[];
  /** Ce nu s-a putut verifica — onestitatea care face restul credibil. */
  caveats: string[];
};

/** Analizele optionale. Lipsa lor nu opreste raportul — doar il face mai sarac. */
export type ExtraAudit = {
  structura?: StructuraAudit;
  cuvinte?: KeywordAudit;
  pmax?: PmaxAudit;
  shopping?: ShoppingAudit;
};

const ron = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} RON`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * @param marginPct marja folosita la calculul pragului (ca sa o putem explica in raport)
 * @param minRoas   pragul derivat din marja
 * @param catalogComplete cand e false, numarul de produse moarte nu e de incredere
 */
export function buildReport(
  result: AuditResult,
  tracking: TrackingState,
  marginPct: number,
  minRoas: number,
  catalogComplete = true,
  extra: ExtraAudit = {}
): ReportModel {
  const findings: Finding[] = [];
  const caveats: string[] = [];
  const t = result.totals;

  // ── 1. Masurarea stricata: cea mai scumpa greseala, si e MASURATA ──────────
  if (!tracking.ok) {
    findings.push({
      key: "tracking",
      title: "Cheltuiesti fara sa stii ce aduce bani",
      ron: t.totalCost,
      tier: "MASURAT",
      body:
        `In ultimele 12 luni au trecut ${ron(t.totalCost)} prin cont, iar Google nu a stiut ` +
        `care dintre ei au adus vanzari. ` +
        (tracking.junkPrimary.length
          ? `Motivul: ${tracking.reasons[0]}. Licitarea automata cumpara clicuri de la oamenii ` +
            `care fac acele actiuni, nu de la cei care cumpara. `
          : `Motivul: ${tracking.reasons[0]}. `) +
        `Practic, tot bugetul de mai sus s-a cheltuit pe orb: nu a putut fi optimizat catre ` +
        `vanzare, pentru ca sistemul nu stia ce inseamna o vanzare.`,
    });
  }

  // ── 2. Produse care ard buget — depinde de conversii, deci de masurare ─────
  if (result.villains.length) {
    if (tracking.ok) {
      findings.push({
        key: "villains",
        title: `${result.villains.length} produse consuma buget fara sa se acopere`,
        ron: result.villainsTotalCost,
        tier: "MASURAT",
        body:
          `La marja ta de ${marginPct}%, un produs trebuie sa aduca cel putin ` +
          `${minRoas.toFixed(2)} lei la fiecare leu cheltuit ca sa iasa pe zero. ` +
          `${result.villains.length} produse stau sub pragul asta si au consumat impreuna ` +
          `${ron(result.villainsTotalCost)}.`,
        // Cele mai scumpe primele: alea sunt produsele pe care le opresti luni dimineata.
        produse: result.villains.slice(0, MAX_PRODUSE).map((v) => ({
          titlu: v.title,
          cost: Math.round(v.cost),
          roas: v.productRoas,
        })),
        produseRestante: Math.max(0, result.villains.length - MAX_PRODUSE),
      });
    } else {
      findings.push({
        key: "villains-quarantined",
        title: `${result.villains.length} produse nu pot fi judecate pana nu repari masurarea`,
        ron: 0,
        tier: "MASURAT",
        quarantined: true,
        body:
          `Aceste produse au consumat ${ron(result.villainsTotalCost)} si apar cu zero vanzari. ` +
          `Nu spunem ca sunt slabe: pe un cont in care vanzarile nu se masoara, cifra asta nu ` +
          `dovedeste nimic. Se pot judeca corect dupa ce masurarea e reparata si trec 30 de zile.`,
        // Fara ROAS: pe masurare stricata, cifra aia n-ar insemna nimic si ar arata ca o acuzatie.
        produse: result.villains.slice(0, MAX_PRODUSE).map((v) => ({
          titlu: v.title,
          cost: Math.round(v.cost),
        })),
        produseRestante: Math.max(0, result.villains.length - MAX_PRODUSE),
      });
      caveats.push(
        "Care produse chiar pierd bani — imposibil de spus pana la repararea masurarii."
      );
    }
  }

  // ── 3. Catalog mort — valid indiferent de masurare ─────────────────────────
  if (catalogComplete && result.zombies.count > 0) {
    findings.push({
      key: "zombies",
      title: `${result.zombies.count} produse nu au fost vazute de niciun client`,
      // Fapt, fara suma inventata: nu stim cat ar fi adus, deci nu punem cifra in bani.
      ron: 0,
      tier: "MASURAT",
      body:
        `Sunt ${pct(result.zombies.pctOfCatalog)} din catalogul tau — produse care nu au avut ` +
        `nicio afisare in 12 luni. Nu au costat nimic, dar nici nu exista pentru cumparatori: ` +
        `stau in magazin fara sa ajunga vreodata in fata cuiva.`,
      produse: result.zombies.list.slice(0, MAX_PRODUSE).map((p) => ({
        titlu: p.title,
        cost: 0,
      })),
      produseRestante: Math.max(0, result.zombies.count - MAX_PRODUSE),
    });
  }
  if (!catalogComplete) {
    caveats.push("Cate produse nu au fost afisate niciodata — nu am putut citi catalogul complet.");
  }

  // ── 4. CSS: estimare etichetata ───────────────────────────────────────────
  if (result.cssOverpaid && result.cssOverpaid > 0) {
    findings.push({
      key: "css",
      title: "Platesti mai mult decat trebuie pe fiecare click",
      ron: result.cssOverpaid,
      tier: "ESTIMARE",
      body:
        `Magazinele care ruleaza Shopping direct prin Google platesc pana la ~20% in plus pe ` +
        `click fata de cele care merg printr-un partener CSS. Aplicat pe cei ${ron(t.totalCost)} ` +
        `cheltuiti de tine, inseamna aproximativ ${ron(result.cssOverpaid)}. ` +
        `Cheltuiala e reala, procentul e un reper de piata — de aceea il marcam ca estimare.`,
    });
  }

  // ── 4b. Cautari platite care nu au adus nicio vanzare ─────────────────────
  // Doctrina (CHECKLIST 3.x): un termen cu cost si ZERO conversii e risipa curata. Nu se
  // confunda cu "converteste sub target" — ala e o problema de licitare, nu de relevanta.
  const cuv = extra.cuvinte;
  if (cuv?.risipa.length && cuv.risipaTotal > 0) {
    findings.push({
      key: "termeni-risipa",
      title: `${cuv.risipa.length} cautari au consumat buget fara nicio vanzare`,
      ron: cuv.risipaTotal,
      tier: "MASURAT",
      exclusDinTotal: true,
      body:
        `In ultimele 30 de zile, reclamele tale au aparut la cautari care au adus clicuri ` +
        `platite si zero comenzi — ${ron(cuv.risipaTotal)} in total. ` +
        `Sunt oameni care cautau altceva decat vinzi tu. ` +
        `Cifra e pe 30 de zile, nu pe 12 luni ca restul raportului, si de asta nu am adunat-o ` +
        `in totalul de sus.`,
      termeni: cuv.risipa.slice(0, MAX_PRODUSE),
      termeniRestanti: Math.max(0, cuv.risipa.length - MAX_PRODUSE),
    });
  }
  // Cand modulul de Shopping a stabilit deja ca lipseste Shopping standard, cauza e spusa acolo
  // ca punct de atac, cu ce se face. Repetata aici, ar suna a doua constatare diferita.
  const shoppingLipsa = (extra.shopping?.probleme ?? []).some((p) => p.cod === "shopping-lipsa");
  if (cuv && !cuv.areVizibilitateTermeni && !shoppingLipsa) {
    caveats.push(
      "Pe ce cuvinte se duc banii — contul nu ruleaza Shopping standard, iar Performance Max " +
        "nu raporteaza costul pe termen de cautare."
    );
  }

  // ── 5. Ce ar aduce bugetul curatat — SIMULARE, ultimul, ca sa nu fie confundat cu masuratul
  // Depinde de valoarea conversiilor, deci pe cont cu masurare stricta nu are ce arata.
  const sim = result.zone2Simulation;
  if (sim && tracking.ok && t.survivorsRoas) {
    // ATENTIE la ce se compara. Doua scenarii DIFERITE, care nu se amesteca:
    //   (a) MUTAREA banilor de la produsele slabe catre cele bune — acelasi buget total,
    //       fara niciun leu in plus. Asta e "curatarea" propriu-zisa.
    //   (b) MARIREA bugetului castigatorilor de 2x / 5x — bani noi, alta discutie.
    // Formula din spec (x2 = roas * 2 * cost_castigatori) e scenariul (b). Daca prezinti (b)
    // ca si cum ar rezulta din (a), promiti o dublare din simpla mutare a unei sume mai mici.
    const bugetMutat = t.survivorsCost + result.villainsTotalCost;
    // Plafon de bun-simt: produsele bune NU absorb oricat buget la acelasi randament — au un
    // volum limitat de cautari. Fara plafon, un cont cu castigatori foarte eficienti scotea
    // +395.000 lei dintr-o cheltuiala anuala de 22.000 (caz real, granox): corect ca inmultire,
    // dar o cifra pe care orice om cu experienta o citeste ca exagerare si inchide raportul.
    // Limitam castigul la dublarea incasarilor actuale ale castigatorilor.
    const PLAFON = 2;
    const dupaMutare = Math.min(t.survivorsRoas * bugetMutat, sim.current * PLAFON);
    const plafonat = t.survivorsRoas * bugetMutat > sim.current * PLAFON;
    const castigDinMutare = Math.max(0, dupaMutare - sim.current);

    findings.push({
      key: "simulare",
      title: "Cat ar aduce acelasi buget, mutat pe produsele care vand",
      ron: castigDinMutare,
      tier: "SIMULARE",
      body:
        `Produsele care chiar vand la tine se intorc de ${t.survivorsRoas.toFixed(2)} ori si aduc ` +
        `acum ${ron(sim.current)}. Daca opresti produsele slabe si muti acei ${ron(result.villainsTotalCost)} ` +
        `catre ele — fara sa adaugi niciun leu in plus — ar putea ajunge la ${ron(dupaMutare)}. ` +
        (plafonat
          ? `Am oprit calculul la dublarea incasarilor actuale, desi inmultirea seaca ar da mai ` +
            `mult: produsele bune au un volum limitat de cautari si nu absorb oricat buget la ` +
            `acelasi randament. `
          : "") +
        `E un plafon optimist, nu o promisiune: la buget mai mare randamentul scade de obicei. ` +
        `Si sunt incasari, nu profit — profitul depinde de marja ta.`,
    });
  }

  // ── Puncte de atac: setari gresite, tinute separat de banii pierduti ───────
  const puncte: PunctDeAtac[] = [
    ...(extra.structura?.probleme ?? []),
    ...(extra.shopping?.probleme ?? []),
    ...(extra.pmax?.probleme ?? []),
  ].map((p) => ({
    cod: p.cod,
    titlu: p.titlu,
    ron: Math.round(p.ron),
    detaliu: p.detaliu,
    grad: p.grad,
    exemple: p.exemple,
  }));

  // Un magazin care isi negativeaza propriul nume isi opreste singur cel mai ieftin trafic pe
  // care il are (CHECKLIST 3.3). Gasit real pe DeHome: "dehome" negativ, 30 din 40 de produse.
  for (const tox of (cuv?.toxice ?? []).filter((t2) => t2.eBrand)) {
    puncte.push({
      cod: "negativ-brand",
      titlu: `Iti blochezi singur numele: "${tox.cuvant}"`,
      ron: 0,
      grad: "critic",
      detaliu:
        `Ai pus "${tox.cuvant}" pe lista de cuvinte blocate. Cand cineva cauta exact numele ` +
        `magazinului tau — cel mai ieftin si cel mai sigur client pe care il poti avea — ` +
        `reclama ta nu apare. Sunt ${tox.produseBlocate} produse afectate.`,
      exemple: tox.exemple,
    });
  }

  // Restul se aduna intr-un singur punct. Pe Granox erau 12 cuvinte toxice: 12 carduri
  // identice se citesc ca zgomot si ingroapa constatarile mari de deasupra lor.
  const altele = (cuv?.toxice ?? []).filter((t2) => !t2.eBrand);
  if (altele.length) {
    const produseBlocate = altele.reduce((s, t2) => s + t2.produseBlocate, 0);
    puncte.push({
      cod: "negative-toxice",
      titlu:
        altele.length === 1
          ? `Un cuvant blocat opreste produse pe care le vinzi`
          : `${altele.length} cuvinte blocate opresc produse pe care le vinzi`,
      ron: 0,
      grad: "costa",
      detaliu:
        `Lista ta de cuvinte blocate contine termeni care apar in titlurile unor produse aflate ` +
        `la vanzare. Reclamele pentru ele nu au voie sa se afiseze — ${produseBlocate} produse ` +
        `sunt oprite asa, fara sa se vada nicaieri in rapoarte.`,
      exemple: altele.map((t2) => `${t2.cuvant} — ${t2.produseBlocate} produse`),
    });
  }

  const rangGrad = { critic: 0, costa: 1, reglaj: 2 } as const;
  puncte.sort((a, b) => rangGrad[a.grad] - rangGrad[b.grad] || b.ron - a.ron);

  // Ordonare pe bani in joc; carantinatele coboara la final, nu au suma.
  for (const f of findings) f.ron = Math.round(f.ron);

  // Ordinea nu e doar pe bani: intai ce e real (MASURAT/ESTIMARE), apoi proiectia, apoi ce nu
  // se poate judeca. Altfel castigul simulat — de regula cel mai mare numar din raport — ar
  // sta primul si ar face proiectia sa arate ca principala concluzie.
  const rang = (f: Finding) => (f.quarantined ? 2 : f.tier === "SIMULARE" ? 1 : 0);
  findings.sort((a, b) => rang(a) - rang(b) || b.ron - a.ron);

  caveats.push(
    "Marja pe produs — folosim valoarea data de tine, deci vorbim despre incasari, nu despre profit."
  );
  if (result.cssOverpaid) {
    caveats.push("Daca folosesti deja un partener CSS — de confirmat in cont.");
  }

  const headlineRon = findings
    .filter((f) => f.tier === "MASURAT" && !f.quarantined && !f.exclusDinTotal)
    .reduce((s, f) => s + f.ron, 0);

  return {
    // Rotunjit la sursa: altfel fiecare consumator (pagina, PDF, email) trebuie sa-si aduca
    // aminte s-o faca, iar unul va uita si va livra "1.236,687 RON" catre client.
    headline: {
      ron: Math.round(headlineRon),
      label: tracking.ok
        ? "cheltuiti fara sa se acopere in ultimele 12 luni"
        : "cheltuiti fara sa stii ce au adus, in ultimele 12 luni",
    },
    trackingBroken: !tracking.ok,
    findings,
    puncte,
    caveats,
  };
}
