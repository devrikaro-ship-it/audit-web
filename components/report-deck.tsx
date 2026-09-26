import type { ReactNode } from "react";
import "@/app/r/report-deck.css";
import { buildDeck, paginateChecklist, paginateStandard, toneOf, VERDICT_LABEL, type CheckRow, type StdGroup, type StdRow } from "@/lib/report-deck";
import { verdict } from "@/lib/scoring";
import { cap, CONTACT, countOf, fill, MONTHS, NOUN, UI, UI_LEADS, WORD } from "@/lib/copy-registry";
import type { AuditData } from "@/lib/types";

const formatDate = (ms: number) => { const d = new Date(ms); return fill(UI.date, { day: d.getDate(), month: MONTHS[d.getMonth()], year: d.getFullYear() }); };

// The standard SEO checklist: every component with its rows, each ✓ (passes on every page checked), ✗ with its fix,
// or ? "de verificat" when it could not be measured from outside the site.
const MARK: Record<StdRow["state"], string> = { ok: "✓", fail: "✗", verify: "?" };
function StandardChecklist({ groups }: { groups: StdGroup[] }) {
  return (
    <table className="check std"><tbody>
      {groups.flatMap((g, gi) => [
        <tr className="group" key={`g${gi}`}><td colSpan={2}>{g.name}</td><td className="res">{g.score === null ? WORD.verify : fill(UI.scoreOf100, { score: g.score })}</td></tr>,
        ...g.rows.flatMap((r, i) => [
          ...(r.question && r.question !== g.rows[i - 1]?.question ? [<tr className="question" key={`${gi}-q${i}`}><td colSpan={3}>{r.question}</td></tr>] : []),
          <tr className={r.state} key={`${gi}-${i}`}>
            <td className={`box ${r.state}`}><span>{MARK[r.state]}</span></td>
            <td className="what"><b>{r.title}</b>{r.problem && <small className={`problem ${r.state}`}>{r.problem}</small>}{r.note && <small>{r.note}</small>}</td>
            <td className="res">{r.result}</td>
          </tr>,
        ]),
      ])}
    </tbody></table>
  );
}

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
          <span className="label">{UI.doneLabel}</span>
          <div className="okgrid">{done.map((r, i) => <div key={i}><b>{r.title}</b><span>{r.result}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

// phone: the report printed as a portrait PDF for reading on a phone (narrow pages, the phone layout).
export function ReportDeck({ data, createdAt, phone = false }: { data: AuditData; createdAt?: number; phone?: boolean }) {
  // A lead site reads the same slides in its own words (UI_LEADS).
  const T = data.siteKind?.type === "leads" ? { ...UI, ...UI_LEADS } : UI;
  const d = buildDeck(data);
  // "4 pagini", "51 de pagini": the count as Romanian writes it.
  const pagesRead = countOf(d.pages, NOUN.page);
  const readOn = fill(T.readOn, { pages: pagesRead });
  const Top = ({ eyebrow }: { eyebrow: string }) => (
    <div className="top"><span className="eyebrow">{eyebrow}</span><span className="brandmark">{d.domain}</span></div>
  );

  // Each entry is one slide: [eyebrow, body, footer source]. Numbering is added when rendering.
  const slides: { cls?: string; eyebrow: string; body: ReactNode; src?: string }[] = [];
  const v = verdict(d.score);

  slides.push({
    cls: "cover", eyebrow: T.coverEyebrow,
    src: createdAt ? fill(T.coverSourceDated, { date: formatDate(createdAt), pages: pagesRead }) : fill(T.coverSource, { pages: pagesRead }),
    body: (<>
      <div className="covrow">
        <h1>{d.cover}</h1>
        <div className={`score ${toneOf(d.score)}`}><span className="num">{d.score}</span><small>{T.outOf100}</small><em>{VERDICT_LABEL[v]}</em></div>
      </div>
      <div className="moves">
        <div className="move"><span className="num">1</span><div><h3>{fill(T.coverPart1, { score: d.seo.score })}</h3><p>{T.coverPart1Lead}</p></div></div>
        <div className="move"><span className="num">2</span><div><h3>{fill(T.coverPart2, { score: d.ux.score ?? "—" })}</h3><p>{T.coverPart2Lead}</p></div></div>
      </div>
    </>),
  });

  const scored = d.seo.zones.filter((z): z is typeof z & { score: number } => z.score !== null);
  const best = [...scored].sort((a, b) => b.score - a.score)[0];
  const worst = [...scored].sort((a, b) => a.score - b.score)[0];
  const plainName = (n: string) => n.replace(/^\d+\.\s*/, "");
  slides.push({
    eyebrow: T.summaryEyebrow,
    body: (<>
      <h2>{T.summaryTitle}</h2>
      <div className="sum">
        <div className="si"><span className="label">{T.summaryOverall}</span><h3>{fill(T.summaryOverallValue, { score: d.score, verdict: VERDICT_LABEL[v].toLowerCase() })}</h3><p>{fill(T.summaryOverallText, { pages: pagesRead })}</p></div>
        <div className="si"><span className="label">{T.part1Label}</span><h3>{fill(T.scoreOf100, { score: d.seo.score })}</h3><p>{best && worst ? fill(T.summarySeoText, { best: plainName(best.name), worst: plainName(worst.name).toLowerCase() }) : T.summarySeoUnmeasured}</p></div>
        <div className="si"><span className="label">{T.part2Label}</span><h3>{fill(T.scoreOf100, { score: d.ux.score ?? "—" })}</h3><p>{fill(T.summaryUxText, { speed: d.ux.speed.mobile === "—" ? WORD.verify : d.ux.speed.mobile })}</p></div>
        <div className="si hl"><span className="label">{T.summaryFirst}</span><h3>{d.first?.title ?? T.summaryFirstNone}</h3><p>{d.first?.text}</p></div>
      </div>
    </>),
  });

  // ── Part 1: SEO
  slides.push({
    cls: "part", eyebrow: T.part1Eyebrow,
    body: (<>
      <span className="num pnum">01</span>
      <h2>{T.part1Title}</h2>
      <p className="lead">{T.part1Lead}</p>
      <ul>{d.seo.pills.map((x) => <li key={x}>{x}</li>)}</ul>
    </>),
  });
  slides.push({
    eyebrow: T.part1Label,
    body: (<>
      <h2>{fill(T.seoTitle, { score: d.seo.score })}</h2>
      <table className={`perf${d.seo.zones.length > 6 ? " compact" : ""}`}>
        <thead><tr><th>{d.seo.zones.length > 6 ? T.thComponent : T.thZone}</th><th className="what">{d.seo.zones.some((z) => z.why) ? T.thWhy : T.thWhat}</th><th>{T.thScore}</th><th>{T.thVerdict}</th></tr></thead>
        <tbody>{d.seo.zones.map((z) => (
          <tr key={z.name}><td><b>{z.name}</b><span className="muted inwhat">{z.why ?? z.what}</span></td><td className="muted what">{z.why ?? z.what}</td><td className="n">{z.score ?? "—"}</td><td>{z.score === null
            ? <span className="pill warn">{cap(WORD.verify)}</span>
            : <span className={`pill ${toneOf(z.score)}`}>{VERDICT_LABEL[verdict(z.score)]}</span>}</td></tr>
        ))}</tbody>
      </table>
    </>),
  });
  slides.push({
    eyebrow: T.part1Label,
    body: (<>
      <h2>{T.problemsTitle}</h2>
      <div className="probs">
        {d.seo.problems.length ? d.seo.problems.map((p) => (
          <div className="prob" key={p.title}>
            <div><b>{p.title}</b><span className={`pill ${p.tone}`}>{p.count}</span></div>
            <p>{p.problem}</p>
            <p className="fix">{fill(T.problemsFix, { fix: p.fix })}</p>
          </div>
        )) : <p>{T.problemsNone}</p>}
      </div>
    </>),
  });
  if (d.seo.product) {
    const p = d.seo.product;
    slides.push({
      eyebrow: T.part1Label,
      body: (<>
        <h2>{T.productTitle}</h2>
        <div className="stats3">
          <div className="stat"><span className="num">{p.checked}</span><p>{T.productChecked}</p></div>
          <div className={`stat ${p.weakTitles ? "hl" : ""}`}><span className="num">{p.weakTitles}</span><p>{T.productWeakTitles}</p></div>
          <div className="stat"><span className="num">{p.missingMeta}</span><p>{T.productMissingMeta}</p></div>
        </div>
        <div className="pairs">{p.pairs.map((x) => <div className="pair" key={x.label}><span className="label">{x.label}</span><b>{x.value}</b></div>)}</div>
      </>),
    });
  }
  if (d.seo.ai) {
    slides.push({
      eyebrow: T.part1Label, src: fill(T.aiSource, { pages: pagesRead }),
      body: (<>
        <h2>{T.aiTitle}</h2>
        <div className="ai3">{d.seo.ai.map((c) => (
          <div className={`aic ${c.tone}`} key={c.label}><span className="label">{c.label}</span><span className="num">{c.big}</span><p>{c.text}</p><p className="why">{c.why}</p></div>
        ))}</div>
      </>),
    });
  }
  if (d.seo.standard) {
    const stdPages = paginateStandard(d.seo.standard);
    stdPages.forEach((groups, i) => slides.push({
      eyebrow: T.seoChecklistEyebrow,
      body: (<><h2>{T.seoChecklistTitle}{stdPages.length > 1 ? fill(T.checklistPage, { i: i + 1, n: stdPages.length }) : ""}</h2><StandardChecklist groups={groups} /></>),
    }));
  } else {
    const seoPages = paginateChecklist(d.seo.checklist);
    seoPages.forEach((pg, i) => slides.push({
      eyebrow: T.seoChecklistEyebrow,
      body: (<><h2>{T.seoChecklistTitle}{seoPages.length > 1 ? fill(T.checklistPage, { i: i + 1, n: seoPages.length }) : ""}</h2><Checklist {...pg} /></>),
    }));
  }

  // ── Part 2: UX / UI
  slides.push({
    cls: "part", eyebrow: T.part2Eyebrow,
    body: (<>
      <span className="num pnum">02</span>
      <h2>{T.part2Title}</h2>
      <p className="lead">{T.part2Lead}</p>
      <ul><li>{T.speedLabel}</li>{d.ux.pages.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>),
  });
  slides.push({
    eyebrow: T.part2Label,
    body: (<>
      <h2>{fill(T.uxTitle, { score: d.ux.score ?? "—" })}</h2>
      <div className="uxrow">
        <div className="speed">
          <span className="label">{T.speedLabel}</span>
          {d.ux.speed.mobile === "—" ? (<>
            <span className="num">?</span>
            <p>{T.speedUnmeasured}</p>
          </>) : (<>
            <span className="num">{d.ux.speed.mobile.split(" /")[0]}<small>/100</small></span>
            <p>{T.speedLcpBefore}<b>{d.ux.speed.lcp}</b>{fill(T.speedLcpAfter, { desktop: d.ux.speed.desktop })}</p>
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
      eyebrow: T.part2Label,
      body: (<>
        <h2>{T.pagesTitle}</h2>
        <div className="pages4">{d.ux.pages.map((p) => (
          <div className="pg" key={p.id}><span className="label">{p.name}</span>
            <ul>{p.score === null && <li>{T.pageUnread}</li>}{p.found.map((x) => <li className="y" key={"y" + x}>{x}</li>)}{p.missing.map((x) => <li className="n" key={"n" + x}>{x}</li>)}</ul>
          </div>
        ))}</div>
      </>),
    });
  }
  if (d.ux.standard) {
    const uxStdPages = paginateStandard(d.ux.standard);
    uxStdPages.forEach((groups, i) => slides.push({
      eyebrow: T.uxChecklistEyebrow,
      body: (<><h2>{T.uxChecklistTitle}{uxStdPages.length > 1 ? fill(T.checklistPage, { i: i + 1, n: uxStdPages.length }) : ""}</h2><StandardChecklist groups={groups} /></>),
    }));
  } else {
    const uxPages = paginateChecklist(d.ux.checklist);
    uxPages.forEach((pg, i) => slides.push({
      eyebrow: T.uxChecklistEyebrow,
      body: (<><h2>{T.uxChecklistTitle}{uxPages.length > 1 ? fill(T.checklistPage, { i: i + 1, n: uxPages.length }) : ""}</h2><Checklist {...pg} /></>),
    }));
  }

  slides.push({
    cls: "contact", eyebrow: T.contactEyebrow, src: T.contactSource,
    body: (<>
      <h2>{T.contactTitle}</h2>
      <p className="lead">{T.contactLead}</p>
      <div className="contacts">
        {CONTACT.map((c) => <div key={c.label}><span className="label">{c.label}</span><b><a href={c.href}>{c.text}</a></b></div>)}
      </div>
    </>),
  });

  const total = slides.length;
  return (
    <div className={phone ? "deck phone" : "deck"}>
      {slides.map((s, i) => (
        <section className={`slide ${s.cls ?? ""}`} key={i}>
          <Top eyebrow={s.eyebrow} />
          <div className="body">{s.body}</div>
          <div className="foot">
            <span><span className="tag m">{T.sourceMeasured}</span> {s.src ?? readOn} · {T.sourceSite}</span>
            <span className="count">{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          </div>
        </section>
      ))}
    </div>
  );
}
