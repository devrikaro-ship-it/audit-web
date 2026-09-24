import type { ReactNode } from "react";
import "@/app/r/report-deck.css";
import { buildDeck, paginateChecklist, toneOf, VERDICT_LABEL, type CheckRow } from "@/lib/report-deck";
import { verdict } from "@/lib/scoring";
import type { AuditData } from "@/lib/types";

const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const formatDate = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

function Checklist({ todo, done }: { todo: CheckRow[]; done: CheckRow[] }) {
  return (
    <div className="cl">
      {todo.length > 0 && (
        <table className="check"><tbody>
          {todo.map((r, i) => (
            <tr key={i}>
              <td className="box"><span /></td>
              <td className="what"><b>{r.title}</b>{r.note && <small>{r.note}</small>}</td>
              <td className="res">{r.result}</td>
            </tr>
          ))}
        </tbody></table>
      )}
      {done.length > 0 && (
        <div>
          <span className="label">Deja in regula</span>
          <div className="okgrid">{done.map((r, i) => <div key={i}><b>{r.title}</b><span>{r.result}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

export function ReportDeck({ data, createdAt }: { data: AuditData; createdAt?: number }) {
  const d = buildDeck(data);
  const readOn = `citit pe ${d.pages} de pagini`;
  const Top = ({ eyebrow }: { eyebrow: string }) => (
    <div className="top"><span className="eyebrow">{eyebrow}</span><span className="brandmark">{d.domain}</span></div>
  );

  // Each entry is one slide: [eyebrow, body, footer source]. Numbering is added when rendering.
  const slides: { cls?: string; eyebrow: string; body: ReactNode; src?: string }[] = [];
  const v = verdict(d.score);

  slides.push({
    cls: "cover", eyebrow: "Audit site · Devrika",
    src: `${createdAt ? formatDate(createdAt) + " · " : ""}${d.pages} de pagini citite: categorii si produse`,
    body: (<>
      <div className="covrow">
        <h1>{d.cover}</h1>
        <div className={`score ${toneOf(d.score)}`}><span className="num">{d.score}</span><small>din 100</small><em>{VERDICT_LABEL[v]}</em></div>
      </div>
      <div className="moves">
        <div className="move"><span className="num">1</span><div><h3>Partea 1 · SEO · {d.seo.score}/100</h3><p>cum te gasesc clientii in Google si in asistentii AI</p></div></div>
        <div className="move"><span className="num">2</span><div><h3>Partea 2 · UX / UI · {d.ux.score ?? "—"}/100</h3><p>cat de usor cumpara un vizitator, pe telefon si pe desktop</p></div></div>
      </div>
    </>),
  });

  const best = [...d.seo.zones].sort((a, b) => b.score - a.score)[0];
  const worst = [...d.seo.zones].sort((a, b) => a.score - b.score)[0];
  slides.push({
    eyebrow: "Pe scurt",
    body: (<>
      <h2>Totul pe o pagina</h2>
      <div className="sum">
        <div className="si"><span className="label">Scor general</span><h3>{d.score}/100 — {VERDICT_LABEL[v].toLowerCase()}</h3><p>Calculat pe {d.pages} de pagini care vand: categorii si produse, nu articole de blog.</p></div>
        <div className="si"><span className="label">Partea 1 · SEO</span><h3>{d.seo.score}/100</h3><p>{best.name} sta cel mai bine; {worst.name.toLowerCase()} are cel mai mult de castigat.</p></div>
        <div className="si"><span className="label">Partea 2 · UX / UI</span><h3>{d.ux.score ?? "—"}/100</h3><p>Viteza pe mobil {d.ux.speed.mobile === "—" ? "de verificat" : d.ux.speed.mobile}; paginile de produs si de categorie sunt verificate pe pagini reale.</p></div>
        <div className="si hl"><span className="label">Primul lucru de reparat</span><h3>{d.first?.title ?? "Nimic urgent"}</h3><p>{d.first?.text}</p></div>
      </div>
    </>),
  });

  // ── Part 1: SEO
  slides.push({
    cls: "part", eyebrow: "Partea 1",
    body: (<>
      <span className="num pnum">01</span>
      <h2>SEO: cum te gasesc clientii</h2>
      <p className="lead">Ce vede Google cand iti citeste paginile de categorie si de produs, si ce vad ChatGPT, Claude sau Perplexity cand cineva le intreaba unde sa cumpere.</p>
      <ul>{d.seo.zones.map((z) => <li key={z.name}>{z.name}</li>)}</ul>
    </>),
  });
  slides.push({
    eyebrow: "Partea 1 · SEO",
    body: (<>
      <h2>SEO: {d.seo.score}/100</h2>
      <table className="perf">
        <thead><tr><th>Zona</th><th>Ce verificam</th><th>Scor</th><th>Verdict</th></tr></thead>
        <tbody>{d.seo.zones.map((z) => (
          <tr key={z.name}><td><b>{z.name}</b></td><td className="muted">{z.what}</td><td className="n">{z.score}</td><td><span className={`pill ${toneOf(z.score)}`}>{VERDICT_LABEL[verdict(z.score)]}</span></td></tr>
        ))}</tbody>
      </table>
    </>),
  });
  slides.push({
    eyebrow: "Partea 1 · SEO",
    body: (<>
      <h2>Ce e de reparat pe pagini</h2>
      <div className="probs">
        {d.seo.problems.length ? d.seo.problems.map((p) => (
          <div className="prob" key={p.title}>
            <div><b>{p.title}</b><span className={`pill ${p.tone}`}>{p.count}</span></div>
            <p>{p.problem}</p>
            <p className="fix">Cum se repara: {p.fix}</p>
          </div>
        )) : <p>Nicio problema gasita pe paginile citite.</p>}
      </div>
    </>),
  });
  if (d.seo.product) {
    const p = d.seo.product;
    slides.push({
      eyebrow: "Partea 1 · SEO",
      body: (<>
        <h2>Paginile de produs, asa cum le vede Google</h2>
        <div className="stats3">
          <div className="stat"><span className="num">{p.checked}</span><p>pagini de produs verificate</p></div>
          <div className={`stat ${p.weakTitles ? "hl" : ""}`}><span className="num">{p.weakTitles}</span><p>cu titlu scurt sau generic</p></div>
          <div className="stat"><span className="num">{p.missingMeta}</span><p>fara descriere pentru Google</p></div>
        </div>
        <div className="pairs">{p.pairs.map((x) => <div className="pair" key={x.label}><span className="label">{x.label}</span><b>{x.value}</b></div>)}</div>
      </>),
    });
  }
  if (d.seo.ai) {
    slides.push({
      eyebrow: "Partea 1 · SEO", src: `setarile de acces ale site-ului si datele pentru Google de pe ${d.pages} de pagini`,
      body: (<>
        <h2>Vizibilitate in ChatGPT, Claude si Perplexity</h2>
        <div className="ai3">{d.seo.ai.map((c) => (
          <div className={`aic ${c.tone}`} key={c.label}><span className="label">{c.label}</span><span className="num">{c.big}</span><p>{c.text}</p><p className="why">{c.why}</p></div>
        ))}</div>
      </>),
    });
  }
  const seoPages = paginateChecklist(d.seo.checklist);
  seoPages.forEach((pg, i) => slides.push({
    eyebrow: "Partea 1 · SEO · Checklist",
    body: (<><h2>Checklist SEO{seoPages.length > 1 ? ` (${i + 1}/${seoPages.length})` : ""}</h2><Checklist {...pg} /></>),
  }));

  // ── Part 2: UX / UI
  slides.push({
    cls: "part", eyebrow: "Partea 2",
    body: (<>
      <span className="num pnum">02</span>
      <h2>UX / UI: cat de usor se cumpara</h2>
      <p className="lead">Ce traieste un vizitator de la prima pagina pana la cos: cat asteapta, cum gaseste produsul si ce il ajuta sa decida.</p>
      <ul><li>Viteza pe mobil</li>{d.ux.pages.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>),
  });
  slides.push({
    eyebrow: "Partea 2 · UX / UI",
    body: (<>
      <h2>UX / UI: {d.ux.score ?? "—"}/100</h2>
      <div className="uxrow">
        <div className="speed">
          <span className="label">Viteza pe mobil</span>
          {d.ux.speed.mobile === "—" ? (<>
            <span className="num">?</span>
            <p>De verificat: viteza nu a putut fi masurata din afara site-ului in momentul auditului.</p>
          </>) : (<>
            <span className="num">{d.ux.speed.mobile.split(" /")[0]}<small>/100</small></span>
            <p>Continutul principal apare in <b>{d.ux.speed.lcp}</b> (tinta: sub 2,5 s). Pe desktop: {d.ux.speed.desktop}.</p>
          </>)}
        </div>
        <table className="perf"><tbody>{d.ux.pages.map((p) => (
          <tr key={p.id}><td><b>{p.name}</b></td><td className="n">{p.score ?? "—"}</td><td><span className={`pill ${p.tone}`}>{p.verdict}</span></td></tr>
        ))}</tbody></table>
      </div>
    </>),
  });
  if (d.ux.pages.length) {
    slides.push({
      eyebrow: "Partea 2 · UX / UI",
      body: (<>
        <h2>Ce am gasit pe fiecare tip de pagina</h2>
        <div className="pages4">{d.ux.pages.map((p) => (
          <div className="pg" key={p.id}><span className="label">{p.name}</span>
            <ul>{p.score === null && <li>De verificat: nu am citit o astfel de pagina.</li>}{p.found.map((x) => <li className="y" key={"y" + x}>{x}</li>)}{p.missing.map((x) => <li className="n" key={"n" + x}>{x}</li>)}</ul>
          </div>
        ))}</div>
      </>),
    });
  }
  const uxPages = paginateChecklist(d.ux.checklist);
  uxPages.forEach((pg, i) => slides.push({
    eyebrow: "Partea 2 · UX / UI · Checklist",
    body: (<><h2>Checklist UX / UI{uxPages.length > 1 ? ` (${i + 1}/${uxPages.length})` : ""}</h2><Checklist {...pg} /></>),
  }));

  slides.push({
    cls: "contact", eyebrow: "Intrebari", src: "raport generat automat de Devrika",
    body: (<>
      <h2>Intrebari despre raport?</h2>
      <p className="lead">Iti explicam oricare punct din checklist si cum il repari, fie ca il faci singur, fie cu echipa ta.</p>
      <div className="contacts">
        <div><span className="label">Razvan</span><b><a href="tel:+40742374325">0742 374 325</a></b></div>
        <div><span className="label">Vlad</span><b><a href="tel:+40756281176">0756 281 176</a></b></div>
        <div><span className="label">Email</span><b><a href="mailto:hello@devrika.ro">hello@devrika.ro</a></b></div>
      </div>
    </>),
  });

  const total = slides.length;
  return (
    <div className="deck">
      {slides.map((s, i) => (
        <section className={`slide ${s.cls ?? ""}`} key={i}>
          <Top eyebrow={s.eyebrow} />
          <div className="body">{s.body}</div>
          <div className="foot">
            <span><span className="tag m">Masurat</span> {s.src ?? readOn} · audit.devrika.ro</span>
            <span className="count">{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          </div>
        </section>
      ))}
    </div>
  );
}
