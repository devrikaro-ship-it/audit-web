#!/usr/bin/env python3
"""Genereaza raportul HTML (A4, brand Devrika) dintr-un JSON de date.
Design vizual: carduri, scoruri mari, putin text. Doar SEO + Google Ads.
Usage: python build.py date.json raport.html
Schema JSON: vezi assets/example.json
"""
import os, sys, json, base64

HERE = os.path.dirname(os.path.abspath(__file__))
CSS = open(os.path.join(HERE, "..", "assets", "styles.css"), encoding="utf-8").read()
_mark = os.path.join(HERE, "..", "assets", "logo-mark.png")
if os.path.exists(_mark):
    _b64 = base64.b64encode(open(_mark, "rb").read()).decode()
    MARK = f'<img class="logo-mark" src="data:image/png;base64,{_b64}" alt="Devrika">'
    LOGO = f'<div class="logo-lockup">{MARK}<span class="logo-word">devrika</span></div>'
else:
    MARK = ""
    LOGO = '<div class="cover-logo-text">DEVRIKA AGENCY</div>'

def color(s):
    s = int(s)
    return "#1A7A4A" if s >= 70 else "#D45B00" if s >= 40 else "#C0392B"

def verdict(s):
    s = int(s)
    return "Solid" if s >= 70 else "De imbunatatit" if s >= 40 else "Slab"

def footer(p):
    return (f'<div class="page-footer"><span class="footer-text">Confidential — Devrika Agency · devrika.ro</span>'
            f'<span class="footer-page">Pagina {p}</span></div>')

def phead(label, sub_right, chip="", chip_cls="gray", intro=""):
    chip_html = f'<span class="sec-chip {chip_cls}">{chip}</span>' if chip else ""
    intro_html = f'<div class="sec-intro">{intro}</div>' if intro else ""
    return (f'<div class="page-header"><div class="head-left">{chip_html}'
            f'<span class="page-section-label">{label}</span></div>'
            f'<div class="page-logo-sm">{sub_right}</div></div>{intro_html}')

SEV_LABEL = {"critical": "Critic", "high": "Mare", "medium": "Mediu", "low": "Rapid"}

def cards(arr, grow=False):
    out = ""
    for f in arr:
        sev = f.get("sev", "medium")
        tag = f'<span class="fcard-tag">{f["tag"]}</span>' if f.get("tag") else ""
        eff = f'<span class="fcard-eff">{f["effort"]}</span>' if f.get("effort") else ""
        out += (f'<div class="fcard {sev}">'
                f'<div class="fcard-sev">{SEV_LABEL.get(sev, "Mediu")}</div>'
                f'<div class="fcard-main"><div class="fcard-title">{f["title"]}</div>'
                f'<div class="fcard-impact">{f.get("impact","")}</div></div>'
                f'<div class="fcard-side">{tag}{eff}</div></div>')
    return f'<div class="cards{" grow" if grow else ""}">{out}</div>'

def tech_chips(arr, title="Semnale tehnice verificate"):
    if not arr:
        return ""
    chips = ""
    for c in arr:
        ok = c.get("ok", True)
        col = "#1A7A4A" if ok else "#C0392B"
        mark = "&#10003;" if ok else "&#10007;"
        chips += (f'<span class="chip" style="margin:0 1.5mm 1.5mm 0;padding:1mm 2.5mm;font-size:6.5pt">'
                  f'<span style="color:{col};font-weight:700">{mark}</span> {c["label"]}</span>')
    return (f'<div class="section-title">{title}</div>'
            f'<div style="display:flex;flex-wrap:wrap;margin-bottom:3mm">{chips}</div>')

def steps(arr, grow=False):
    out = ""
    for i, a in enumerate(arr):
        zone = a.get("zone", "SEO"); zcls = "ads" if "ad" in zone.lower() else "seo"
        out += (f'<div class="step"><div class="step-n">{i+1}</div>'
                f'<div class="step-body"><div class="step-title">{a["title"]}</div>'
                f'<div class="step-sub">{a.get("sub","")}</div></div>'
                f'<span class="step-zone {zcls}">{zone}</span></div>')
    return f'<div class="steps{" grow" if grow else ""}">{out}</div>'

def build(d):
    s = d["scores"]
    tag = d["client"]
    sub = d.get("logo_sm", f'{tag} · Audit Devrika · {d.get("date","")}')
    cta = d.get("cta", {})
    av = d.get("ads_verdict", {})
    vcls = "ok" if av.get("ok") else "warn"
    verdict_block = (f'<div class="verdict-block"><div class="verdict-badge {vcls}">{av.get("badge","")}</div>'
                     f'<div class="verdict-txt">{av.get("text","")}</div></div>') if av else ""

    html = f'''<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audit Devrika — {tag}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>{CSS}</style></head><body>

<div class="page cover">
  <div class="cover-top"><div class="agency-badge">Devrika</div><div class="cover-date">{d.get("date","")}</div></div>
  <div class="cover-hero">
    <div class="cover-titles"><div class="cover-tag">Audit Gratuit · SEO + Google Ads</div>
      <h1 class="cover-title">{tag}</h1>
      <p class="cover-subtitle">Cat de bine te gasesc clientii online — si cat pierzi</p></div>
    <div class="gauge-wrap"><canvas id="gaugeChart"></canvas>
      <div class="gauge-center"><div class="gauge-score">{s["global"]}</div><div class="gauge-max">din 100</div>
        <div class="gauge-label">Vizibilitate online</div></div></div>
    <div class="bigscore-row">
      <div class="bigscore"><div class="bigscore-num" style="color:{color(s["seo"])}">{s["seo"]}</div>
        <div class="bigscore-lbl">SEO</div><div class="bigscore-verdict" style="color:{color(s["seo"])}">{verdict(s["seo"])}</div></div>
      <div class="bigscore"><div class="bigscore-num" style="color:{color(s["ads"])}">{s["ads"]}</div>
        <div class="bigscore-lbl">Google Ads</div><div class="bigscore-verdict" style="color:{color(s["ads"])}">{verdict(s["ads"])}</div></div>
    </div>
  </div>
  <div class="cover-footer"><div class="cover-meta">
    <strong>Site analizat:</strong> {d.get("url","")}<br>
    <strong>Platforma:</strong> {d.get("platform","")}<br>
    <strong>Tip business:</strong> {d.get("business","")}<br>
    <strong>Pregatit de:</strong> Devrika Agency</div>
    <div class="cover-logo-area">{LOGO}</div></div>
</div>

<div class="page page-inner">
  {phead("Ce am gasit pe scurt", sub, "REZUMAT", "gray")}
  <div class="pfill">
    <div class="callout"><strong>Pe scurt:</strong> {d.get("summary","")}</div>
    <div class="hero-stats">
      <div class="hero-stat bad"><div class="hero-stat-num">{d.get("n_probleme","")}</div>
        <div class="hero-stat-txt">probleme care iti scad vizibilitatea si vanzarile</div></div>
      <div class="hero-stat good"><div class="hero-stat-num">{d.get("n_oportunitati","")}</div>
        <div class="hero-stat-txt">oportunitati de crestere, gata de pornit</div></div>
    </div>
    <div class="section-title">Probleme principale</div>
    {cards(d.get("costs", []), grow=True)}
  </div>
  {footer(2)}
</div>

<div class="page page-inner">
  {phead("Cum te gasesc clientii", sub, "SEO", "seo", d.get("seo_intro", "Cat de usor te gasesc clientii in Google si in raspunsurile AI."))}
  <div class="pfill">
    {tech_chips(d.get("tech_signals", []))}
    <div class="section-title">Ce te tine pe loc</div>
    {cards(d.get("seo_findings", []), grow=True)}
  </div>
  {footer(3)}
</div>

<div class="page page-inner">
  {phead("Google Ads &amp; Shopping", sub, "GOOGLE ADS", "ads", d.get("ads_intro", "Ce masori, pe ce CSS rulezi in Shopping si unde se pierde buget."))}
  <div class="pfill">
    {tech_chips(d.get("track_signals", []), "Ce masori acum (tracking, pixeli, Shopping)")}
    <div class="section-title">Bani lasati pe masa</div>
    {cards(d.get("ads_findings", []), grow=True)}
  </div>
  {footer(4)}
</div>

<div class="page page-inner">
  {phead("Ce facem mai departe", sub, "PLAN", "gray")}
  <div class="pfill">
    {f'<div class="callout">{d["plan_intro"]}</div>' if d.get("plan_intro") else ""}
    <div class="section-title">Plan prioritizat</div>
    {steps(d.get("plan", []), grow=True)}
    <div class="cta"><h3>{cta.get("title","Vrei sa rezolvam asta pentru tine?")}</h3>
      <p>{cta.get("text","Echipa Devrika poate implementa tot planul de mai sus. Prima discutie e gratuita.")}</p>
      <span class="cta-btn">{cta.get("btn","Programeaza o discutie gratuita")}</span>
      <div class="cta-contact">{cta.get("contact","<strong>devrika.ro</strong> · hello@devrika.ro · Razvan 0742 374 325 · Vlad 0756 281 176")}</div></div>
  </div>
  {footer(5)}
</div>

<script>(function(){{var c=document.getElementById('gaugeChart');if(!c)return;var sc={s["global"]},f=sc/100;
new Chart(c,{{type:'doughnut',data:{{datasets:[{{data:[f,1-f],backgroundColor:['#0ABECF','rgba(255,255,255,0.08)'],borderWidth:0,circumference:270,rotation:225}}]}},
options:{{responsive:true,maintainAspectRatio:true,cutout:'72%',plugins:{{legend:{{display:false}},tooltip:{{enabled:false}}}},animation:{{duration:0}}}}}});}})();</script>
</body></html>'''
    return html

def main():
    if len(sys.argv) < 3:
        sys.exit("usage: python build.py date.json raport.html")
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    open(sys.argv[2], "w", encoding="utf-8").write(build(d))
    print("HTML generat:", sys.argv[2])

if __name__ == "__main__":
    main()
