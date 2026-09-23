import Link from "next/link";
import "../dvk.css";
import "./landing.css";

export const metadata = {
  title: "Audit gratuit pentru magazine online — Devrika",
  description: "Afla in cateva minute unde pierde clienti magazinul tau: cum te gaseste Google si cat de usor cumpara un vizitator. Gratuit, fara cont.",
};

// The scan forms are plain GET forms to /start, so they work without JavaScript; /start picks up ?url=.
function ScanForm({ id }: { id: string }) {
  return (
    <form className="scan" action="/start" method="get">
      <label htmlFor={id} className="sr">Adresa magazinului</label>
      <input id={id} name="url" type="text" inputMode="url" placeholder="magazinul-tau.ro" autoComplete="url" required />
      <button className="btn btn-cyan" type="submit">Scaneaza magazinul →</button>
    </form>
  );
}

const leaks = [
  { t: "Produse care nu apar in cautari", d: "Titluri si descrieri pe care Google nu le poate lega de ce cauta oamenii." },
  { t: "Pagini lente pe telefon", d: "Fiecare secunda in plus la incarcare pierde cumparatori." },
  { t: "Pasi greoi pana la cos", d: "Poze putine, pret sau stoc neclar, buton greu de gasit." },
  { t: "Categorii fara filtre si text", d: "Clientul nu isi gaseste produsul, iar Google nu intelege pagina." },
];

const areas = [
  { badge: "Vizibilitate", title: "SEO", hook: "Cat de usor te gaseste lumea gratuit in Google.", why: "Trafic gratuit pe care acum il pierzi",
    checks: ["Titluri, descrieri si structura paginilor", "Continut si cuvinte cheie pe categorii si produse", "Titlurile si descrierile paginilor de produs", "Sitemap, linkuri interne, date structurate"] },
  { badge: "Cumparare", title: "UX / UI", hook: "Cat de usor e sa cumpere cineva de la tine.", why: "Fiecare pas greu inseamna comenzi pierdute",
    checks: ["Viteza pe telefon", "Homepage: mesaj clar, meniu, cale spre produse", "Pagina produs: poze, pret, stoc, „adauga in cos”, recenzii", "Pagina categorie, filtre si sortare"] },
];

const steps = [
  { t: "Dai adresa magazinului", d: "Il scanam pe loc si iti aratam ce am gasit: platforma si structura." },
  { t: "Ne spui ce te preocupa", d: "Si unde trimitem raportul. Timp in care analizam magazinul in fundal." },
  { t: "Primesti raportul", d: "Scor, probleme si ce e de facut, pe categoriile si produsele tale." },
];

const faq = [
  { q: "Chiar e gratuit?", a: "Da. Auditul nu costa nimic si nu iti cerem cardul." },
  { q: "Aveti nevoie de acces la magazin?", a: "Nu. Citim doar ce vede orice vizitator: paginile publice ale magazinului." },
  { q: "Cat dureaza?", a: "De obicei sub un minut. Magazinele care blocheaza robotii pot dura cateva minute." },
  { q: "Ce faceti cu datele mele?", a: "Numele, emailul si telefonul le folosim ca sa iti trimitem raportul si sa te putem contacta pentru o discutie, daca vrei." },
];

export default function AuditSEO() {
  return (
    <div className="dvk">
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/devrika-logo.svg" alt="Devrika" width={142} height={34} />
          </Link>
          <nav className="nav" aria-label="Pagina">
            <a href="#ce-verificam">Ce verificam</a>
            <a href="#cum-functioneaza">Cum functioneaza</a>
            <a href="#intrebari">Intrebari</a>
          </nav>
          <div className="right">
            <a className="phone" href="tel:+40756281176">
              <i><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg></i>
              0756 281 176
            </a>
            <a className="btn-indigo" href="#scan">Scaneaza magazinul →</a>
          </div>
        </div>
      </header>

      <section className="hero split-hero" id="scan">
        <div className="wrap">
          <div>
            <h1>Afla unde pierde clienti magazinul tau <em>online</em></h1>
            <div className="tag">Audit gratuit · SEO si UX/UI</div>
            <p className="lead"><b>Fara cont, fara card.</b> Dai adresa magazinului si in cateva minute vezi cum te gaseste Google si cat de usor cumpara un vizitator — pe paginile care vand.</p>
            <ScanForm id="url-hero" />
            <div className="under"><span className="pill">60 de pagini</span> citim categoriile si produsele tale · <b>raport in ~1 minut</b></div>
          </div>
          <aside className="card" aria-label="Exemplu de raport">
            <div className="chead"><span className="dom">magazinul-tau.ro</span><span className="live">Exemplu de raport</span></div>
            <div className="tiles">
              <div className="tile wide">
                <div style={{ flex: 1 }}><small>Scor general</small><strong>72<span>/100</span></strong></div>
                <div style={{ flex: 2 }}>
                  <small>SEO · 61</small><div className="bar"><i style={{ width: "61%" }} /></div>
                  <small style={{ marginTop: 10 }}>UX / UI · 58</small><div className="bar"><i style={{ width: "58%", background: "var(--cyan)" }} /></div>
                </div>
              </div>
              <div className="tile"><small>Pagini citite</small><strong>60</strong></div>
              <div className="tile"><small>Probleme gasite</small><strong>14</strong></div>
            </div>
            <div className="finding"><small>Pagini de produs</small>17 din 24 au titluri scurte sau generice</div>
            <div className="chips"><span className="chip">Viteza pe mobil</span><span className="chip">Schema</span><span className="chip">Categorii</span><span className="chip">Filtre</span></div>
            <p className="note">Cifre exemplu. Raportul tau arata cifrele magazinului tau.</p>
          </aside>
        </div>
      </section>

      <section className="stats" aria-label="In cifre">
        <div className="wrap">
          {[["180+", "magazine analizate"], ["3.100+", "probleme gasite"], ["60", "pagini citite in fiecare audit"], ["4.8/5", "nota medie de la clienti"]].map(([n, l]) => (
            <div key={l} className="stat"><strong>{n}</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      <section className="problem">
        <div className="wrap">
          <div className="split">
            <div><div className="eyebrow">De ce</div><h2>Primesti vizite, dar putine devin comenzi</h2></div>
            <p>De cele mai multe ori nu traficul e problema, ci lucruri mici si ascunse pe paginile care vand. Auditul le arata pe toate, dintr-o privire.</p>
          </div>
          <div className="leaks">
            {leaks.map((l) => <div key={l.t} className="leak"><b>{l.t}</b><span>{l.d}</span></div>)}
          </div>
        </div>
      </section>

      <section className="areas" id="ce-verificam">
        <div className="wrap">
          <div className="split">
            <div><div className="eyebrow">Ce verificam</div><h2>Doua zone unde un magazin pierde clienti</h2></div>
            <p>Citim pana la 60 de pagini — categorii si produse, nu articole de blog — si le verificam asa cum le vede Google si asa cum le vede un cumparator.</p>
          </div>
          <div className="area-grid">
            {areas.map((a, i) => (
              <article key={a.title} className={`area${i === 0 ? " feature" : ""}`}>
                <span className="badge">{a.badge}</span>
                <h3>{a.title}</h3>
                <p>{a.hook}</p>
                <ul>{a.checks.map((c) => <li key={c}>{c}</li>)}</ul>
                <span className="why">{a.why}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="steps" id="cum-functioneaza">
        <div className="wrap">
          <div className="split">
            <div>
              <div className="eyebrow">Cum functioneaza</div>
              <h2>De la adresa la raport, in 3 pasi</h2>
              <p>Nu ai nevoie de cunostinte tehnice si nici de acces la contul magazinului.</p>
              <div className="aside"><b>Primesti in raport</b><ul><li>Scor pe SEO si UX/UI</li><li>Ce e de reparat, pe paginile care vand</li><li>Explicatii pe intelesul oricui</li></ul></div>
            </div>
            <div className="step-list">
              {steps.map((s, i) => <div key={s.t} className="step"><span className="n">{i + 1}</span><div><b>{s.t}</b><span>{s.d}</span></div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="faq" id="intrebari">
        <div className="wrap">
          <div className="eyebrow">Intrebari</div>
          <h2>Inainte sa incepi</h2>
          {faq.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <div className="eyebrow on-dark">Audit gratuit</div>
          <h2>Vezi unde pierde clienti <em>magazinul tau</em></h2>
          <p>Pentru magazine online. Fara cont. Rezultate in cateva minute.</p>
          <ScanForm id="url-final" />
          <div className="contact"><span>Razvan · 0742 374 325</span><span>Vlad · 0756 281 176</span><span>hello@devrika.ro</span></div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span className="name">Devrika</span>
          <span><Link href="/confidentialitate">Confidentialitate</Link> · <Link href="/termeni">Termeni</Link></span>
          <span>© {new Date().getFullYear()} Devrika Agency · <a href="https://devrika.ro">devrika.ro</a></span>
        </div>
      </footer>
    </div>
  );
}
