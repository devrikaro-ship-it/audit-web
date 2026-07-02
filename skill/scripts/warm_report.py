#!/usr/bin/env python3
"""
warm_report.py — output VIZUAL pt auditul CALD (intern, multi-canal).
JSON date -> HTML branduit Devrika (dark hero + carduri lizibile pe canale + plan).
Ruleaza:  python warm_report.py date.json iesire.html
Self-contained (Google Fonts CDN). Randeaza in PDF cu html_to_pdf.py daca vrei.
"""
import json, sys, html

NAVY="#13163A"; NAVY2="#23265F"; INDIGO="#47499E"; CYAN="#0ABECF"
RED="#C0392B"; REDB="#FEF2F2"; ORANGE="#D45B00"; ORANGEB="#FFF4E6"
YEL="#B45309"; YELB="#FFFBEB"; GREEN="#1A7A4A"; GREENB="#F0FFF4"
G400="#8FA3C0"; G500="#64748b"; G600="#4A5E7A"; G800="#1E2D42"; SLATE="#F4F6FB"; BORD="#E6EBF4"

SEV={"critic":(RED,REDB,"CRITIC"),"mediu":(YEL,YELB,"MEDIU"),"info":(INDIGO,"#EEF1FF","INFO"),"ok":(GREEN,GREENB,"OK")}
def esc(s): return html.escape(str(s)) if s is not None else ""

def finding_card(f, idx=None):
    fg,bg,lab = SEV.get(f.get("sev","mediu"), SEV["mediu"])
    num = f'<div class="fc-num">{idx:02d}</div>' if idx is not None else ""
    fix = f'<p class="fc-fix"><b>Ce facem:</b> {esc(f["fix"])}</p>' if f.get("fix") else ""
    meta = f'<span class="fc-meta">{esc(f["meta"])}</span>' if f.get("meta") else ""
    return f"""<div class="fc">{num}<div class="fc-body">
      <div class="fc-top"><span class="fc-badge" style="color:{fg};background:{bg}">{lab}</span>{meta}</div>
      <h4 class="fc-title">{esc(f['title'])}</h4>
      <p class="fc-prob">{esc(f.get('problema',''))}</p>{fix}</div></div>"""

def chan_card(c):
    rows=""
    for kpi in c.get("kpis",[]):
        col = kpi.get("color") or G800
        rows += f'<div class="kpi"><div class="kpi-v" style="color:{col}">{esc(kpi["v"])}</div><div class="kpi-l">{esc(kpi["l"])}</div></div>'
    badge = c.get("verdict","")
    bc = {"bun":GREEN,"slab":RED,"mediu":ORANGE}.get(c.get("state"),CYAN)
    hb = ""
    if c.get("score") is not None:
        s = int(c["score"]); sc = GREEN if s>=67 else (ORANGE if s>=40 else RED)
        hb = f'<div class="hb"><div class="hb-lab"><span>Sanatate cont</span><b style="color:{sc}">{s}/100</b></div><div class="hb-track"><div class="hb-fill" style="width:{s}%;background:{sc}"></div></div></div>'
    return f"""<div class="chan">
      <div class="chan-h"><h3>{esc(c['name'])}</h3><span class="chan-vd" style="background:{bc}">{esc(badge)}</span></div>
      <div class="kpis">{rows}</div>{hb}
      <p class="chan-note">{esc(c.get('note',''))}</p></div>"""

def build(d):
    chans = "".join(chan_card(c) for c in d.get("channels",[]))
    def block(title, sub, items):
        if not items: return ""
        cards="".join(finding_card(f) for f in items)
        return f'<section class="sec"><h2>{esc(title)}</h2><p class="sub">{esc(sub)}</p>{cards}</section>'
    gfind = block("Google Ads — ce e in neregula", d.get("google_sub",""), d.get("google",[]))
    mfind = block("Meta Ads — ce e in neregula", d.get("meta_sub",""), d.get("meta",[]))
    plan = "".join(f'<div class="step"><span class="step-n">{i+1}</span><div><b>{esc(p["t"])}</b><span>{esc(p.get("d",""))}</span></div></div>' for i,p in enumerate(d.get("plan",[])))
    tgt = d.get("targets",{})
    extra = ""
    if tgt.get("business"):
        extra = f'<div class="tgt"><div class="tgt-v">{esc(tgt["business"])}</div><div class="tgt-l">{esc(tgt.get("business_l","venit real / 90z"))}</div></div>'
    g = d.get("gun"); gun_html = ""
    if g:
        strike = g.get("strike", True)
        lcls = "gun-big bad" if strike else "gun-big neutral"
        gcls = "gun" if strike else "gun gun-soft"
        gun_html = f'''<div class="{gcls}"><div class="gun-row">
      <div class="gun-side"><div class="gun-lab">{esc(g.get('left_lab','Platforma raporteaza'))}</div><div class="{lcls}">{esc(g['left'])}</div><div class="gun-sub">{esc(g.get('left_sub',''))}</div></div>
      <div class="gun-vs">{esc(g.get('vs','vs realitate'))}</div>
      <div class="gun-side"><div class="gun-lab">{esc(g.get('right_lab','GA4 — vanzari reale'))}</div><div class="gun-big good">{esc(g['right'])}</div><div class="gun-sub">{esc(g.get('right_sub',''))}</div></div>
    </div><p class="gun-note">{g.get('note','')}</p></div>'''
    opp = d.get("opportunity"); opp_html = ""
    if opp:
        opp_html = f'<div class="opp"><div class="opp-h">{esc(opp.get("h","Banii pe masa"))}</div><div class="opp-v">{esc(opp["v"])}</div><div class="opp-b">{opp.get("b","")}</div></div>'
    proof = d.get("proof") or []; proof_html = ""
    if proof:
        chips = "".join(f'<span class="chip">{c}</span>' for c in proof)
        proof_html = f'<div class="proof"><div class="proof-h">{esc(d.get("proof_h","Rezultate cu acelasi sistem, pe alte conturi Devrika"))}</div><div class="chips">{chips}</div></div>'
    qw = d.get("quickwins") or []; qw_html = ""
    if qw:
        cards = "".join(f'<div class="qwc"><div class="qwc-n">PAS {i+1}</div><div class="qwc-t">{esc(w["t"])}</div><div class="qwc-d">{esc(w.get("d",""))}</div></div>' for i,w in enumerate(qw))
        qw_html = f'<section class="sec"><h2>Primii pasi — saptamana 1</h2><p class="sub">Efect imediat, fara dependente. De-aici incepe.</p><div class="qw">{cards}</div></section>'
    return f"""<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Audit cont — {esc(d['client'])} — Devrika</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0;padding:0}} body{{font-family:'Inter',sans-serif;background:{SLATE};color:{G800}}}
.wrap{{max-width:960px;margin:0 auto;padding:0 24px}}
h1,h2,h3,h4{{font-family:'Sora',sans-serif}}
header{{background:radial-gradient(120% 120% at 50% -10%, {NAVY2} 0%, {NAVY} 60%);color:#fff;padding:30px 0 56px}}
.htop{{display:flex;justify-content:space-between;align-items:center}}
.brand{{font-family:'Sora';font-weight:800;letter-spacing:.18em;font-size:15px;color:{CYAN}}}
.date{{font-size:13px;color:{G400}}}
.badge{{display:inline-block;font-family:'Sora';font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:{CYAN};background:rgba(71,73,158,.45);border:1px solid rgba(10,190,207,.3);padding:6px 14px;border-radius:999px}}
.hero-c{{text-align:center;margin-top:38px}} .hero-c h1{{font-size:44px;font-weight:800;margin:14px 0 6px}}
.hero-sub{{font-size:18px;color:#C7D2E8}}
.verdict{{max-width:760px;margin:26px auto 0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:20px 24px;font-size:16px;line-height:1.55;color:#EAF0FA}}
.verdict b{{color:{CYAN}}}
.tgts{{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:24px}}
.tgt{{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 24px;text-align:center}}
.tgt-v{{font-family:'Sora';font-size:26px;font-weight:800;color:{CYAN}}} .tgt-l{{font-size:12px;color:{G400};margin-top:2px}}
.method{{max-width:720px;margin:20px auto 0;text-align:center;font-size:12.5px;color:{G400};line-height:1.5}}
.gun{{max-width:780px;margin:26px auto 0;background:rgba(192,57,43,.12);border:1px solid rgba(255,140,140,.3);border-radius:18px;padding:22px 24px}}
.gun.gun-soft{{background:rgba(10,190,207,.08);border:1px solid rgba(10,190,207,.22)}}
.gun-row{{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}}
.gun-side{{flex:1;min-width:200px;text-align:center}}
.gun-lab{{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:{G400};margin-bottom:4px}}
.gun-big{{font-family:'Sora';font-size:34px;font-weight:800;line-height:1}} .gun-big.bad{{color:#FF9B9B;text-decoration:line-through;text-decoration-thickness:2px}} .gun-big.neutral{{color:#FFC98A}} .gun-big.good{{color:#5EEAD4}}
.gun-sub{{font-size:12.5px;color:#C7D2E8;margin-top:6px;line-height:1.4}}
.gun-vs{{font-family:'Sora';font-weight:700;font-size:12px;color:{G400};padding:0 6px;text-transform:uppercase}}
.gun-note{{text-align:center;font-size:13.5px;color:#EAF0FA;line-height:1.5;margin-top:16px}}
.opp{{background:linear-gradient(135deg,rgba(10,190,207,.08),rgba(71,73,158,.08));border:1px solid {BORD};border-left:4px solid {CYAN};border-radius:16px;padding:24px 26px;margin-top:18px}}
.opp-h{{font-family:'Sora';font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:{INDIGO};margin-bottom:6px}}
.opp-v{{font-family:'Sora';font-size:28px;font-weight:800;color:{NAVY};line-height:1.1;margin-bottom:8px}}
.opp-b{{font-size:14px;color:{G600};line-height:1.55}} .opp-b .est{{color:{G400};font-style:italic}}
.hb{{margin-top:14px}} .hb-lab{{display:flex;justify-content:space-between;font-size:11.5px;color:{G500};margin-bottom:5px}} .hb-lab b{{font-family:'Sora';font-size:13px}}
.hb-track{{height:7px;background:{SLATE};border-radius:99px;overflow:hidden}} .hb-fill{{height:100%;border-radius:99px}}
.proof{{margin-top:18px;background:#fff;border:1px solid {BORD};border-radius:16px;padding:20px 24px}}
.proof-h{{font-family:'Sora';font-size:13px;font-weight:700;color:{NAVY};margin-bottom:12px}}
.chips{{display:flex;flex-wrap:wrap;gap:9px}} .chip{{font-size:12.5px;color:{G800};background:{SLATE};border:1px solid {BORD};border-radius:9px;padding:7px 12px}} .chip b{{color:{GREEN}}}
.qw{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:6px}} @media(max-width:760px){{.qw{{grid-template-columns:1fr}}}}
.qwc{{background:#fff;border:1px solid {BORD};border-top:3px solid {CYAN};border-radius:14px;padding:18px}}
.qwc-n{{font-family:'Sora';font-weight:800;color:{CYAN};font-size:13px;margin-bottom:6px}} .qwc-t{{font-family:'Sora';font-weight:700;font-size:14.5px;color:{G800};margin-bottom:5px}} .qwc-d{{font-size:13px;color:{G600};line-height:1.5}}
.chans{{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:-32px}}
@media(max-width:760px){{.chans{{grid-template-columns:1fr}}}}
.chan{{background:#fff;border:1px solid {BORD};border-radius:18px;padding:22px;box-shadow:0 8px 30px rgba(19,22,58,.08)}}
.chan-h{{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}} .chan-h h3{{font-size:18px;font-weight:800;color:{NAVY}}}
.chan-vd{{color:#fff;font-family:'Sora';font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:7px}}
.kpis{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
.kpi{{background:{SLATE};border-radius:11px;padding:12px}} .kpi-v{{font-family:'Sora';font-size:21px;font-weight:800;color:{G800}}} .kpi-l{{font-size:11.5px;color:{G500};margin-top:1px}}
.chan-note{{font-size:13.5px;color:{G600};line-height:1.5;margin-top:13px}}
.sec{{padding:48px 0 0}} .sec h2{{font-size:27px;font-weight:800;color:{NAVY}}} .sub{{color:{G500};font-size:15px;margin:6px 0 22px}}
.fc{{background:#fff;border:1px solid {BORD};border-radius:16px;padding:22px 26px;box-shadow:0 6px 24px rgba(19,22,58,.05);display:flex;gap:18px;margin-bottom:14px}}
.fc-num{{font-family:'Sora';font-size:22px;font-weight:800;color:#C9D2E3;width:30px;flex-shrink:0}}
.fc-top{{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}}
.fc-badge{{font-family:'Sora';font-weight:800;font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:6px}}
.fc-meta{{font-size:12px;color:{G500};text-transform:uppercase;letter-spacing:.04em}}
.fc-title{{font-size:17px;font-weight:700;color:{G800};margin:0 0 7px}}
.fc-prob{{font-size:14.5px;color:{G600};line-height:1.55;margin:0 0 10px}}
.fc-fix{{font-size:13.5px;color:{G800};line-height:1.5}} .fc-fix b{{color:{INDIGO}}}
.plan{{background:#fff;border:1px solid {BORD};border-radius:18px;padding:26px;margin-top:18px}}
.step{{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid {BORD}}} .step:last-child{{border:0}}
.step-n{{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,{INDIGO},{CYAN});color:#fff;font-family:'Sora';font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}}
.step b{{font-family:'Sora';font-size:15px;color:{G800};display:block}} .step span{{font-size:13.5px;color:{G600}}}
footer{{text-align:center;color:{G400};font-size:13px;padding:36px 0 48px}}
</style></head><body>
<header><div class="wrap">
  <div class="htop"><span class="brand">DEVRIKA</span><span class="date">{esc(d.get('date',''))}</span></div>
  <div class="hero-c"><span class="badge">Audit cont · Google + Meta</span>
    <h1>{esc(d['client'])}</h1><p class="hero-sub">{esc(d.get('subtitle','Unde se duc banii — si unde sunt vanzarile reale'))}</p></div>
  <div class="verdict">{d.get('verdict','')}</div>
  {gun_html}
  <div class="tgts">
    <div class="tgt"><div class="tgt-v">{esc(tgt.get('cpa','—'))}</div><div class="tgt-l">CPA target</div></div>
    <div class="tgt"><div class="tgt-v">{esc(tgt.get('troas','—'))}</div><div class="tgt-l">tROAS target</div></div>
    <div class="tgt"><div class="tgt-v">{esc(tgt.get('aov','—'))}</div><div class="tgt-l">AOV (GA4)</div></div>
    {extra}
  </div>
  <p class="method">Evaluat punct cu punct vs standardul Devrika — playbook Google Ads + Meta Ads (conversii curate · apeluri = venit cu valoare · PMax Value+tROAS · Search brand · OUTCOME_SALES · ROAS real din GA4).</p>
</div></header>
<div class="wrap"><div class="chans">{chans}</div>
{opp_html}{proof_html}
{qw_html}
{gfind}{mfind}
<section class="sec"><h2>Plan de actiune</h2><p class="sub">In ordine — tracking-ul intai, apoi structura.</p><div class="plan">{plan}</div></section>
</div>
<footer>Audit intern Devrika · {esc(d.get('date',''))} · date reale din conturi (Google Ads · Meta · GA4)</footer>
</body></html>"""

if __name__ == "__main__":
    data = json.load(open(sys.argv[1]))
    out = sys.argv[2] if len(sys.argv) > 2 else "warm-report.html"
    open(out, "w").write(build(data))
    print("scris:", out)
