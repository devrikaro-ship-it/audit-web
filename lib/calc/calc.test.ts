import { describe, it, expect } from "vitest";
import { defalcare, roasImbunatatit, proiectie, proiectieCuRoas, pragUniform, type ProiectieIntrari } from "./index";

// Motorul vine copiat din calculatorul de ofertare, unde are propriile teste. Aici verificam
// exact ce foloseste raportul de audit: ca invelisul cheama corect formulele si ca pragul
// afisat e adevarat — la cresterea aratata pe ecran, omul iese pe acelasi profit ca acum.

const BAZA: ProiectieIntrari = {
  bugetLunar: 6000,
  roasAzi: 3.5,
  marjaPct: 35,
  cpcScadePct: 20,
  convCrestePct: 20,
  feeRon: 2000,
  comisionPct: 5,
};

describe("legatura cu motorul copiat", () => {
  it("venitul brut e buget x ROAS", () => {
    const d = defalcare({ canale: { reclame: { buget: 6000, roas: 3.5 } }, marja_pct: 35, tva_pct: 21 });
    expect(d?.venitBrut).toBeCloseTo(21000, 2);
  });

  it("ipoteza casei — CPC -20% si conversie +20% — inseamna ROAS x1,5", () => {
    expect(roasImbunatatit(4, 20, 20)).toBeCloseTo(6, 6);
  });

  it("cursoarele trase la zero nu mai promit nicio crestere", () => {
    const p = proiectie({ ...BAZA, cpcScadePct: 0, convCrestePct: 0 });
    expect(p.roasNou).toBeCloseTo(BAZA.roasAzi, 6);
    expect(p.venitCu).toBeCloseTo(p.venitAcum, 2);
  });
});

describe("proiectia din raport", () => {
  it("arata si cat plateste catre noi, nu doar cat castiga", () => {
    const p = proiectie(BAZA);
    expect(p.plataDevrika).toBeGreaterThan(BAZA.feeRon);
    expect(p.profitCu).not.toBeNull();
  });

  it("la cresterea de prag, profitul cu noi il egaleaza exact pe cel de acum", () => {
    const prag = pragUniform(
      { canale: { reclame: { buget: BAZA.bugetLunar, roas: BAZA.roasAzi } }, marja_pct: BAZA.marjaPct, tva_pct: 21 },
      { fee_ron: BAZA.feeRon, comision_pct: BAZA.comisionPct, baza: "vanzari_nete" },
      BAZA.bugetLunar
    );
    expect(prag.posibil).toBe(true);
    if (!prag.posibil) return;

    const laPrag = proiectieCuRoas(BAZA, BAZA.roasAzi * prag.factor);
    expect(laPrag.profitCu).toBeCloseTo(laPrag.profitAcum as number, 2);
  });

  it("cand ipoteza casei trece peste prag, diferenta ramane la client", () => {
    // Buget mai mare: acelasi onorariu se imparte la mai multe vanzari, deci pragul scade.
    const p = proiectie({ ...BAZA, bugetLunar: 12000, roasAzi: 4 });
    expect(p.crestereNecesaraPct as number).toBeLessThan(50);
    expect(p.profitCu as number).toBeGreaterThan(p.profitAcum as number);
  });

  it("cand pragul e peste ipoteza casei, cifrele o arata — nu o ascund", () => {
    // La 6.000 lei buget si ROAS 3,5, un onorariu de 2.000 + 5% cere +55%, peste ipoteza de
    // +50%. Tool-ul NU are voie sa iasa pe plus in cazul asta: exact aici se negociaza pretul.
    const p = proiectie(BAZA);
    expect(p.crestereNecesaraPct as number).toBeGreaterThan(50);
    expect(p.profitCu as number).toBeLessThan(p.profitAcum as number);
  });

  it("fara onorariu si fara comision completate, nu inventeaza o plata", () => {
    const p = proiectie({ ...BAZA, feeRon: 0, comisionPct: 0 });
    expect(p.plataDevrika).toBe(0);
    expect(p.crestereNecesaraPct).toBeCloseTo(0, 6);
  });
});
