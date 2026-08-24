/**
 * Motorul de calcul al comisionului si al proiectiei.
 *
 * Singura implementare a formulelor din
 * docs/superpowers/specs/2026-08-14-calculator-comision-strategie-design.md (sectiunea 5.2).
 * Functii pure, fara DOM: se testeaza cu Node si se inlineaza in calculatorul HTML.
 */
const Calc = (function () {
  "use strict";

  const num = (v, implicit = 0) => {
    const n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return Number.isFinite(n) ? n : implicit;
  };

  /** Bugetul total de reclame, pe toate canalele. */
  function bugetTotal(intrari) {
    return Object.values((intrari && intrari.canale) || {}).reduce(
      (s, c) => s + num(c && c.buget), 0);
  }

  /**
   * Defalcarea de pe panoul "ce platesti catre noi", in ordinea in care se citeste pe ecran.
   *
   * Scaderile se aplica succesiv, ca sumele afisate sa se adune EXACT pana la baza — un panou care
   * nu inchide la fix e primul lucru pe care il verifica un client neincrezator.
   * Returneaza null cand niciun canal nu are buget (atunci ecranul arata "—", nu "0").
   */
  function defalcare(intrari) {
    const canale = (intrari && intrari.canale) || {};
    if (!Object.values(canale).some((c) => num(c && c.buget) > 0)) return null;

    const venitBrut = Object.values(canale).reduce(
      (s, c) => s + num(c && c.buget) * num(c && c.roas), 0);

    const fRetur = 1 - num(intrari.retur_pct) / 100;
    const fAfil = 1 - num(intrari.afiliat_pct) / 100;
    const fTransp = 1 - num(intrari.transport_pct) / 100;
    const tva = num(intrari.tva_pct, 21) / 100;

    const dupaRetur = venitBrut * fRetur;
    const dupaAfiliat = dupaRetur * fAfil;
    const baza = (dupaAfiliat * fTransp) / (1 + tva);

    return {
      venitBrut,
      scazutRetur: venitBrut - dupaRetur,
      scazutAfiliat: dupaRetur - dupaAfiliat,
      scazutTvaTransport: dupaAfiliat - baza,
      baza,
      // Vanzarile atribuite campaniilor noastre, net, INCLUSIV cele cu cod de afiliat: ele nu ne
      // platesc noua (R4), dar raman venitul clientului, deci pe ele se calculeaza marja lui.
      netAtribuit: (venitBrut * fRetur * fTransp) / (1 + tva),
    };
  }

  /** Ce incaseaza Devrika intr-o luna, pe o varianta de pret. */
  function plata(d, varianta, buget) {
    const pct = num(varianta && varianta.comision_pct) / 100;
    const fee = num(varianta && varianta.fee_ron);
    const comision = varianta && varianta.baza === "buget"
      ? num(buget) * pct
      : (d ? d.baza : 0) * pct;
    return { fee, comision, total: fee + comision };
  }

  /** Ce ramane clientului dupa costul marfii, bugetul de reclame si plata catre noi. */
  function ramane(d, marjaPct, buget, plataTotal) {
    if (!d) return null;
    return d.netAtribuit * (num(marjaPct) / 100) - num(buget) - num(plataTotal);
  }

  /** Canalul propus implicit pentru reparat: cel cu ROAS-ul cel mai mic dintre cele cu buget. */
  function canalDeReparat(intrari) {
    const canale = (intrari && intrari.canale) || {};
    let ales = null;
    for (const [nume, c] of Object.entries(canale)) {
      if (num(c && c.buget) <= 0) continue;
      if (ales === null || num(c.roas) < num(canale[ales].roas)) ales = nume;
    }
    return ales;
  }

  /**
   * La ce ROAS pe canalul ales iese clientul pe acelasi rezultat ca acum — pragul de la care
   * colaborarea se plateste singura. Bugetele raman neschimbate.
   */
  function prag(intrari, varianta, canal, buget) {
    const d = defalcare(intrari);
    const c = ((intrari && intrari.canale) || {})[canal];
    if (!d || !c || num(c.buget) <= 0) {
      return { posibil: false, motiv: "Canalul ales nu are buget, deci nu are de unde sa creasca." };
    }

    const m = num(intrari.marja_pct) / 100;
    const peBuget = varianta && varianta.baza === "buget";
    const comEf = peBuget ? 0 : (num(varianta.comision_pct) / 100) * (1 - num(intrari.afiliat_pct) / 100);
    if (m - comEf <= 0) {
      return {
        posibil: false,
        motiv: "La marja asta, procentul nu se poate acoperi din crestere. Discutam pretul, nu proiectia.",
      };
    }

    const fee = num(varianta && varianta.fee_ron);
    const comisionPeBuget = peBuget ? num(buget) * (num(varianta.comision_pct) / 100) : 0;
    const netCu = (d.netAtribuit * m + fee + comisionPeBuget) / (m - comEf);

    const tva = num(intrari.tva_pct, 21) / 100;
    const fRetur = 1 - num(intrari.retur_pct) / 100;
    const fTransp = 1 - num(intrari.transport_pct) / 100;
    const brutCu = (netCu * (1 + tva)) / (fRetur * fTransp);

    const altele = Object.entries(intrari.canale).reduce(
      (s, [nume, x]) => (nume === canal ? s : s + num(x.buget) * num(x.roas)), 0);

    return { posibil: true, canal, roasDeLa: num(c.roas), roasLa: (brutCu - altele) / num(c.buget) };
  }

  /**
   * Pragul, exprimat ca o crestere procentuala aplicata UNIFORM pe toate canalele — aceleasi unitati
   * ca ipoteza de imbunatatire de pe ecran, ca sa se poata compara direct ("e nevoie de +12%, iar
   * ipoteza noastra e +50%"). Varianta pe un singur canal presupune ca pe celelalte nu facem nimic,
   * ceea ce nu e adevarat: lucram pe toate.
   */
  function pragUniform(intrari, varianta, buget) {
    const d = defalcare(intrari);
    if (!d || !d.netAtribuit) return { posibil: false, motiv: "Nu exista cifre pe care sa se calculeze." };

    const m = num(intrari.marja_pct) / 100;
    const peBuget = varianta && varianta.baza === "buget";
    const comEf = peBuget ? 0 : (num(varianta.comision_pct) / 100) * (1 - num(intrari.afiliat_pct) / 100);
    if (m - comEf <= 0) {
      return {
        posibil: false,
        motiv: "La marja asta, procentul nu se poate acoperi din crestere. Discutam pretul, nu proiectia.",
      };
    }

    const fee = num(varianta && varianta.fee_ron);
    const comisionPeBuget = peBuget ? num(buget) * (num(varianta.comision_pct) / 100) : 0;
    const k = (d.netAtribuit * m + fee + comisionPeBuget) / (d.netAtribuit * (m - comEf));
    return { posibil: true, factor: k, crestereRoasPct: (k - 1) * 100 };
  }

  /** Volumul de vanzari nete la care doua variante de pret costa la fel. */
  function pragVariante(a, b, tvaPct) {
    const dif = (num(b && b.comision_pct) - num(a && a.comision_pct)) / 100;
    if (!dif) return null;
    const pragNet = (num(a && a.fee_ron) - num(b && b.fee_ron)) / dif;
    return { pragNet, pragBrut: pragNet * (1 + num(tvaPct, 21) / 100) };
  }

  /**
   * ROAS-ul care rezulta din cele doua lucruri pe care le facem efectiv: CPC mai mic si rata de
   * conversie mai buna. ROAS = conversie x cos mediu / CPC, deci ROAS-ul se inmulteste cu
   * (1 + conversie) / (1 - cpc). Asa, cresterea nu mai e o cifra afirmata de noi, ci consecinta a
   * doua imbunatatiri pe care clientul le poate discuta separat.
   */
  function roasImbunatatit(roasAzi, cpcScadePct, convCrestePct) {
    const cpc = num(cpcScadePct) / 100;
    if (cpc >= 1) return null;  // CPC redus cu 100% ar insemna clicuri gratis
    return num(roasAzi) * (1 + num(convCrestePct) / 100) / (1 - cpc);
  }

  /**
   * CPC, rata de conversie si cosul mediu trebuie sa dea ROAS-ul raportat. Cand nu il dau, una din
   * cifre e din alta perioada sau din alt raport — se spune calm, inainte sa fie o surpriza.
   */
  function coerenta(p) {
    const cpc = num(p && p.cpc), conv = num(p && p.conv_pct), aov = num(p && p.aov), roas = num(p && p.roas);
    if (!cpc || !conv || !aov || !roas) return null;
    const roasImplicit = (conv / 100) * aov / cpc;
    return { ok: Math.abs(roas - roasImplicit) / roas <= 0.35, roasImplicit, roasRaportat: roas };
  }

  return { bugetTotal, defalcare, plata, ramane, canalDeReparat, prag, pragUniform, pragVariante,
           roasImbunatatit, coerenta };
})();

export default Calc;
