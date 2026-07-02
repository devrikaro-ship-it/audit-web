#!/usr/bin/env python3
"""Aduna semnale SEO + Google Ads/Shopping dintr-un URL public (fara cont, fara chei).
Cross-platform: Windows, macOS, Linux. Doar stdlib.
Usage: python collect.py https://domeniu.ro
"""
import os, sys, re, ssl, time, json, html as ihtml
import urllib.request, urllib.error

UA = "Mozilla/5.0 (compatible; DevrikaAudit/1.0; +https://devrika.ro)"
TIMEOUT = 25

_ctx = ssl.create_default_context()
_ctx_insecure = ssl._create_unverified_context()

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

_last = [0.0]
def _pace(gap=0.4):
    dt = time.time() - _last[0]
    if dt < gap:
        time.sleep(gap - dt)
    _last[0] = time.time()

def _open(url, no_redirect=False, timeout=TIMEOUT):
    _pace()  # auto-limitare: evita rate-limit burst pe server-ul tinta
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last = None
    for ctx in (_ctx, _ctx_insecure):
        handlers = [urllib.request.HTTPSHandler(context=ctx)]
        if no_redirect:
            handlers.append(_NoRedirect)
        try:
            return urllib.request.build_opener(*handlers).open(req, timeout=timeout)
        except urllib.error.HTTPError:
            raise  # status real (403/404...) — nu retry, lasa apelantul sa-l prinda
        except (ssl.SSLError, urllib.error.URLError) as e:
            last = e  # cert verify fail etc. -> incearca contextul insecure
            continue
    raise last if last else RuntimeError("open failed")

def fetch(url, retries=2):
    for attempt in range(retries + 1):
        try:
            r = _open(url)
            body = r.read().decode("utf-8", "ignore")
            if body:
                return body
        except Exception:
            pass
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))  # rate-limit -> backoff crescator
    return ""

def status(url):
    try:
        r = _open(url, no_redirect=True, timeout=15)
        return getattr(r, "status", r.getcode())
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return "ERR"

def headers(url):
    try:
        r = _open(url)
        return {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        return {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
    except Exception:
        return {}

def ttfb(url):
    try:
        t0 = time.time()
        r = _open(url)
        r.read(1)
        return round(time.time() - t0, 3)
    except Exception:
        return None

def first(pat, h):
    m = re.search(pat, h, re.I | re.S)
    return ihtml.unescape(re.sub(r"\s+", " ", m.group(1)).strip())[:200] if m else "(lipsa)"

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python collect.py https://domeniu.ro")
    url = sys.argv[1].rstrip("/")
    domain = re.sub(r"^https?://", "", url).split("/")[0]

    print("================ DEVRIKA AUDIT — COLECTARE SEMNALE ================")
    print("URL:", url); print("Domeniu:", domain)
    print("Data:", time.strftime("%Y-%m-%d %H:%M")); print()

    # ---------- HOMEPAGE ----------
    h = fetch(url + "/")
    hsize = len(h.encode("utf-8"))
    print("===== HOMEPAGE =====")
    print("HTML size:", hsize, "bytes")
    if re.search(r"Just a moment|cf-mitigated|challenge-platform|Attention Required|_cf_chl|Enable JavaScript and cookies", h, re.I) or hsize < 2000:
        print("!!! BLOCKER: site in spatele protectiei anti-bot (Cloudflare/challenge) sau pagina goala.")
        print("!!! Crawler-ul nu primeste HTML real. Optiuni: ruleaza din browser (Playwright) sau cere acces.")
        print("!!! NU genera audit pe datele de mai jos — sunt incomplete/false.")
    print("Title:", first(r"<title[^>]*>(.*?)</title>", h))
    print("Meta desc:", first(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', h))
    h1 = re.findall(r"<h1[^>]*>(.*?)</h1>", h, re.I | re.S)
    print("H1 count:", len(h1))
    if h1: print("H1[0]:", ihtml.unescape(re.sub(r"<[^>]+>|\s+", " ", h1[0]).strip())[:160])
    print("H2 count:", len(re.findall(r"<h2[^>]*>", h, re.I)))
    print("Canonical:", first(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']', h))
    mr = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)', h, re.I)
    print("Meta robots:", (mr.group(1) + (" — !!! NOINDEX" if mr and "noindex" in mr.group(1).lower() else "")) if mr else "(lipsa, default index)")
    print("Hreflang:", "DA (" + str(len(re.findall(r'hreflang=', h, re.I))) + ")" if re.search(r"hreflang", h, re.I) else "NU")
    print("Lang:", first(r'<html[^>]+lang=["\'](.*?)["\']', h))
    imgs = re.findall(r"<img\b[^>]*>", h, re.I)
    noalt = [i for i in imgs if not re.search(r'alt=["\'][^"\']+["\']', i)]
    print(f"Imagini: {len(imgs)} | fara alt: {len(noalt)}")
    fmt = {}
    for m in re.findall(r"\.(jpg|jpeg|png|webp|avif)\b", h, re.I):
        fmt[m.lower()] = fmt.get(m.lower(), 0) + 1
    print("Formate img (sample):", fmt)
    sch = re.findall(r'"@type"\s*:\s*"([^"]+)"', h)
    print("Schema @type:", sorted(set(sch)) or "(niciun JSON-LD)")
    print("OG image:", "DA" if re.search(r"og:image", h, re.I) else "NU")
    print("Viewport meta:", "DA" if re.search(r'name=["\']viewport["\']', h, re.I) else "NU")
    words = len(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style).*?</\1>", " ", h)).split())
    print("Word count (vizibil aprox):", words)
    plat = []
    for sig, name in [("wp-content", "WordPress"), ("woocommerce", "WooCommerce"), ("cdn.shopify", "Shopify"),
                      ("catalog/view", "OpenCart"), ("Journal3", "Journal3"), ("elementor", "Elementor"),
                      ("PrestaShop", "PrestaShop"), ("Magento", "Magento"), ("rank-math", "Rank Math"),
                      ("yoast", "Yoast"), ("wix.com", "Wix")]:
        if re.search(re.escape(sig), h, re.I): plat.append(name)
    print("Platforma/stack:", ", ".join(dict.fromkeys(plat)) or "necunoscut")
    print()

    # ---------- HTTPS / REDIRECT ----------
    print("===== HTTPS / REDIRECT =====")
    print(f"https://{domain} -> {status('https://' + domain)}")
    print(f"http://{domain}  -> {status('http://' + domain)}  (asteptat 301 -> https)")
    print(f"www.{domain}     -> {status('https://www.' + domain)}  (verifica redirect non-www vs duplicat 200)")
    print()

    # ---------- VITEZA ----------
    print("===== VITEZA SERVER (TTFB, masurat) =====")
    t = ttfb(url + "/"); kb = hsize // 1024
    print(f"TTFB homepage: {t}s | HTML homepage: {kb} KB" if t is not None else "TTFB: nemasurat")
    if t is not None:
        print("  -> LENT (>1s): server greu, semnal rosu" if t > 1.0 else "  -> mediu (0.5-1s): de imbunatatit" if t > 0.5 else "  -> ok (<0.5s)")
    print("  -> HTML f. greu (>800KB): risc LCP mobil" if kb > 800 else "  -> HTML greu (>300KB)" if kb > 300 else "  -> HTML ok")
    print()

    # ---------- SECURITATE (headere HTTP) ----------
    print("===== SECURITATE (headere HTTP) =====")
    hd = headers(url + "/")
    sec = {"strict-transport-security": "HSTS", "x-frame-options": "X-Frame-Options",
           "x-content-type-options": "X-Content-Type-Options", "content-security-policy": "CSP",
           "referrer-policy": "Referrer-Policy", "permissions-policy": "Permissions-Policy"}
    missing = [lbl for k, lbl in sec.items() if k not in hd]
    print("Prezente:", ", ".join(lbl for k, lbl in sec.items() if k in hd) or "niciuna")
    print("Lipsa:", ", ".join(missing) or "niciuna (toate prezente)")
    print("Server:", hd.get("server", "(ascuns)"))
    print()

    # ---------- STRUCTURA & AI-READY ----------
    print("===== STRUCTURA & CITABILITATE (AI/GEO) =====")
    visible = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style|nav|footer).*?</\1>", " ", h)))
    sents = [s for s in re.split(r"[.!?]+", visible) if len(s.split()) > 2]
    avg_words = round(sum(len(s.split()) for s in sents) / len(sents), 1) if sents else 0
    print(f"Propozitii lungime medie: {avg_words} cuvinte", "-> greu de citit (>22)" if avg_words > 22 else "-> ok")
    print("Liste (ul/ol):", len(re.findall(r"<(ul|ol)\b", h, re.I)))
    print("FAQ pe pagina:", "DA" if re.search(r"faq|intrebari frecvente", h, re.I) else "NU")
    paras = re.findall(r"<p\b[^>]*>(.*?)</p>", h, re.I | re.S)
    longp = sum(1 for p in paras if len(re.sub(r"<[^>]+>", "", p).split()) > 80)
    print(f"Paragrafe lungi (>80 cuv): {longp} (citabilitate AI scade daca multe)")
    js_dep = words < 120 and len(re.findall(r"<script", h, re.I)) > 10
    print("Continut dependent de JS:", "POSIBIL (text putin + multe scripturi -> risc randare)" if js_dep else "NU (text in HTML)")
    print()

    # ---------- LINK-URI (broken) ----------
    print("===== LINK-URI INTERNE (broken check, esantion) =====")
    links = re.findall(r'href=["\'](https?://[^"\']+|/[^"\':#][^"\']*)["\']', h)
    internal = []
    seen = set()
    for l in links:
        full = l if l.startswith("http") else url + l
        if domain in full and full not in seen and not re.search(r"\.(jpg|png|css|js|svg|webp|ico|woff)", full, re.I):
            seen.add(full); internal.append(full)
    print(f"Link-uri interne pe homepage: {len(internal)}")
    broken = []
    for l in internal[::max(1, len(internal) // 12)][:12]:
        c = status(l)
        # broken real = 404/410/5xx. 401/403/429 = auth/throttle, NU link mort.
        if isinstance(c, int) and (c in (404, 410) or c >= 500):
            broken.append(f"{c} {l}")
    print("Broken (din esantion):", "; ".join(broken) if broken else "0 (esantion curat)")
    print()

    # ---------- ROBOTS ----------
    print("===== ROBOTS.TXT =====")
    robots = fetch(url + "/robots.txt")
    if robots.strip():
        sm = [l.split(":", 1)[1].strip() for l in robots.splitlines() if l.lower().startswith("sitemap:")]
        print("Sitemap declarat:", " | ".join(sm[:3]) or "(niciunul)")
        print("AI bots:")
        for b in ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "anthropic-ai"]:
            print(f"  {b}: {'mentionat' if re.search(b, robots, re.I) else 'nemention (default Allow)'}")
        print("Disallow count:", len(re.findall(r"(?im)^disallow:", robots)))
    else:
        print("robots.txt: LIPSA sau gol")
    print(f"llms.txt: {status(url + '/llms.txt')} (200 = exista)")
    print()

    # ---------- SITEMAP ----------
    print("===== SITEMAP =====")
    smap_url = (sm[0] if robots.strip() and sm else url + "/sitemap_index.xml")
    smap = fetch(smap_url)
    sub_sitemaps = []
    simple_locs = []
    if re.search(r"<sitemapindex", smap, re.I):
        print("Tip: sitemap index (" + smap_url + ")")
        for loc in re.findall(r"<loc>([^<]+)</loc>", smap)[:20]:
            n = len(re.findall(r"<loc>", fetch(loc)))
            print(f"  {loc.rsplit('/', 1)[-1]}: {n} url-uri")
            sub_sitemaps.append(loc)
    elif re.search(r"<urlset", smap, re.I):
        simple_locs = re.findall(r"<loc>([^<]+)</loc>", smap)
        print("Tip: sitemap simplu —", len(simple_locs), "url-uri")
    else:
        print("Sitemap: negasit la", smap_url)
    print()

    # ---------- TRACKING & MASURARE (pixeli, cold din sursa) ----------
    print("===== TRACKING & MASURARE (pixeli, din sursa paginii) =====")
    ga4 = re.search(r'gtag/js\?id=(G-[A-Z0-9]{6,})|["\'](G-[A-Z0-9]{6,})["\']', h, re.I)
    ga4id = (ga4.group(1) or ga4.group(2)) if ga4 else None
    gtm = re.search(r'(GTM-[A-Z0-9]{4,})', h, re.I)
    aw = re.search(r'(AW-\d{6,})', h, re.I)
    aw_alt = bool(re.search(r'google_conversion_id|googleadservices\.com/pagead/conversion', h, re.I))
    fbpix = re.search(r"fbq\(\s*['\"]init['\"]\s*,\s*['\"](\d{6,})", h)
    fbpix_alt = bool(re.search(r'connect\.facebook\.net|fbevents\.js', h, re.I))
    ua = re.search(r'(UA-\d{4,}-\d+)', h)
    ttk = bool(re.search(r'analytics\.tiktok\.com|ttq\.(load|page|track)', h, re.I))
    uet = bool(re.search(r'bat\.bing\.com|uetq\b', h, re.I))
    pin = bool(re.search(r'pintrk\(|s\.pinimg\.com/ct', h, re.I))
    snap = bool(re.search(r'snaptr\(|sc-static\.net', h, re.I))
    consent = next((c for s, c in [(r'cookiebot', 'Cookiebot'), (r'onetrust|otSDK', 'OneTrust'),
                    (r'cookieyes', 'CookieYes'), (r'complianz', 'Complianz'), (r'iubenda', 'iubenda'),
                    (r'usercentrics', 'Usercentrics'), (r'cookie-?law|cookie-?consent|cookie-?notice', 'CMP generic')]
                    if re.search(s, h, re.I)), None)
    consent_mode = bool(re.search(r"gtag\(\s*['\"]consent['\"]", h, re.I))
    behav = [n for s, n in [(r'static\.hotjar|hotjar\.com', 'Hotjar'), (r'clarity\.ms', 'MS Clarity')] if re.search(s, h, re.I)]
    print("Google Analytics 4:", f"DA ({ga4id})" if ga4id else ("posibil (gtag prezent, fara ID vizibil)" if re.search(r'gtag\(', h) else "NU vizibil in sursa"))
    if ua: print("  ! Universal Analytics (" + ua.group(1) + ") inca prezent — depreciat din iul 2023, nu mai colecteaza")
    print("Google Tag Manager:", f"DA ({gtm.group(1)})" if gtm else "NU")
    print("Google Ads conversion/remarketing:", (f"DA ({aw.group(1)})" if aw else "DA") if (aw or aw_alt) else "NU vizibil")
    print("Meta Pixel (Facebook/Instagram):", (f"DA (id {fbpix.group(1)})" if fbpix else "DA") if (fbpix or fbpix_alt) else "NU vizibil")
    print("  Meta CAPI (server-side): nu se poate confirma cold — de verificat in Events Manager")
    print("TikTok Pixel:", "DA" if ttk else "NU")
    print("Microsoft/Bing UET:", "DA" if uet else "NU")
    print("Pinterest Tag:", "DA" if pin else "NU")
    print("Snapchat Pixel:", "DA" if snap else "NU")
    print("Consent/CMP (GDPR):", consent or "NU detectat (risc legal + Consent Mode)")
    print("Consent Mode v2 (gtag consent):", "DA" if consent_mode else "NU vizibil")
    print("Analytics comportament:", ", ".join(behav) or "niciunul (Hotjar/Clarity)")
    _any_track = bool(ga4id or gtm or aw or aw_alt or fbpix or fbpix_alt or ttk or uet or pin or snap)
    if gtm and not (ga4id or fbpix or aw):
        print("  NB: GTM prezent dar pixelii nu apar in HTML brut — se incarca probabil PRIN GTM. Confirma live (Meta Pixel Helper / Google Tag Assistant) inainte sa afirmi 'lipsa'.")
    elif not _any_track:
        print("  NB: niciun tracker vizibil in sursa. Site SPA / consent-gated isi incarca pixelii dupa consimtamant sau prin tag manager server-side.")
        print("      'NU vizibil' NU inseamna 'lipsa' — confirma live (Playwright + Pixel Helper / Tag Assistant) inainte de orice afirmatie in raport.")
    print()

    # ---------- GOOGLE ADS / SHOPPING ----------
    print("===== GOOGLE ADS / SHOPPING — semnale oportunitate =====")
    ecom = bool(re.search(r"add-to-cart|/cart|/product|/cos|adauga in cos|woocommerce|shopify|/shop|/magazin|priceCurrency", h, re.I))
    print("E-commerce detectat:", "DA" if ecom else "NU")
    print("Review/AggregateRating in schema:", "DA" if re.search(r'AggregateRating|"Review"', h) else "NU pe homepage")
    print("Feed produse posibil (verificat HTTP):")
    for f in ["/feed", "/product-feed", "/feed.xml", "/wp-content/uploads/woo-feed",
              "/index.php?route=extension/feed/google_sitemap", "/googlebase.xml", "/feed/google",
              "/products.json", "/sitemap_products_1.xml", "/collections/all.atom"]:
        if status(url + f) == 200:
            print(f"  {f} -> 200")
    print("GMC/Shopping nota: ID Merchant Center si datele din cont NU sunt publice — raporteaza 'de verificat' + oportunitate.")
    print(f"Ads Transparency (competitie): https://adstransparency.google.com/?region=RO&query={domain}")
    print(f"Meta Ad Library (competitie): https://www.facebook.com/ads/library/?q={domain}")
    print("CSS Google Shopping: ruleaza Playwright pe cautare normala -> 'Produse sponsorizate' -> 'De la X' (vezi references/google-ads-research.md)")
    print()

    # ---------- SAMPLE PRODUCT ----------
    if ecom:
        print("===== SAMPLE PAGINA PRODUS =====")
        psm = next((s for s in sub_sitemaps if re.search(r"product|produs", s, re.I)), "")
        prod = ""
        locs = []
        skip = re.compile(r"/(category|categorie|product_cat|collections?|magazin|shop|store|catalog|cont|account|cos|cart|blog|info|despre|contact|termeni|politica|login|register)(/|$|\?)", re.I)
        if psm:
            locs = [l for l in re.findall(r"<loc>([^<]+)</loc>", fetch(psm)) if not skip.search(l)]
        elif simple_locs:
            # sitemap simplu (un fisier) — produsele = url-uri adanci cu id numeric (ex: /cat/brand/12345-slug/)
            locs = [l for l in simple_locs if re.search(r"/\d{3,}-", l) and not skip.search(l)]
            if not locs:
                locs = [l for l in simple_locs if l.rstrip("/").count("/") >= 4 and not skip.search(l)]
        prod = locs[0] if locs else ""
        if not prod:
            m = re.search(re.escape(url) + r"/(produs|product|p)/[a-z0-9-]{6,}/?", h)
            prod = m.group(0) if m else ""
        if prod:
            print("URL probat:", prod)
            # intai produsul (cel mai important) — inainte ca throttling-ul din esantionul de stoc sa apuce
            ph = fetch(prod)
            print("Product schema:", "DA" if re.search(r'"@type"\s*:\s*"Product"', ph) else "NU")
            pm = re.search(r'"price"\s*:\s*"?([\d.,]+)', ph)
            print("Pret schema:", pm.group(1) if pm else "(lipsa)")
            am = re.search(r'availability[^>]*?(InStock|OutOfStock|PreOrder|in_stock|out_of_stock)', ph, re.I)
            print("Availability:", am.group(1) if am else "(lipsa)")
            print("AggregateRating:", "DA" if re.search(r"AggregateRating", ph) else "NU (fara stele in SERP/Shopping)")
            # apoi esantion stoc (delay mic ca sa nu fim throttle-uiti)
            if locs:
                oos = tot = 0
                sample = [u for i, u in enumerate(locs) if i % 9 == 3][:12]
                for u in sample:
                    pg = fetch(u)
                    av = re.search(r"(InStock|OutOfStock|in_stock|out_of_stock)", pg, re.I)
                    if not av: continue
                    tot += 1
                    if re.search(r"out", av.group(1), re.I): oos += 1
                    time.sleep(0.3)
                print(f"Stoc (estimat, esantion {tot} produse cu date): {oos} OutOfStock ({oos*100//tot if tot else 0}%)" if tot else "Stoc: nu am putut esantiona (verifica manual)")
        else:
            print("Nu am putut extrage un URL de produs.")
        print()

    # ---------- PSI / CWV ----------
    key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("PAGESPEED_API_KEY") or ""
    print("===== PERFORMANTA (PageSpeed / CWV) =====")
    print("Cheie Google:", "DA (CWV reali)" if key else "NU (best-effort; seteaza GOOGLE_API_KEY pt CWV reali)")
    psi_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy=mobile"
    if key: psi_url += "&key=" + key
    try:
        d = json.loads(fetch(psi_url))
        # CWV reali din teren (CrUX) — useri reali, daca exista date
        le = d.get("loadingExperience", {}).get("metrics", {})
        if le:
            print("CWV reali (utilizatori, CrUX):")
            for k_, lbl in [("LARGEST_CONTENTFUL_PAINT_MS", "LCP"),
                            ("INTERACTION_TO_NEXT_PAINT", "INP"),
                            ("CUMULATIVE_LAYOUT_SHIFT_SCORE", "CLS")]:
                m = le.get(k_, {})
                if m:
                    v = m.get("percentile"); cat = m.get("category", "")
                    if k_ == "CUMULATIVE_LAYOUT_SHIFT_SCORE" and v is not None: v = v / 100.0
                    if k_ == "LARGEST_CONTENTFUL_PAINT_MS" and v is not None: v = f"{v/1000:.2f}s"
                    if k_ == "INTERACTION_TO_NEXT_PAINT" and v is not None: v = f"{v}ms"
                    print(f"  {lbl}: {v} ({cat})")
        else:
            print("CrUX: fara date de teren (site cu trafic mic). Folosesc lab.")
        lh = d.get("lighthouseResult", {})
        perf = lh.get("categories", {}).get("performance", {}).get("score")
        print("Performance score (lab):", round(perf * 100) if perf is not None else "n/a")
        for k_, lbl in [("largest-contentful-paint", "LCP lab"), ("cumulative-layout-shift", "CLS lab"),
                        ("total-blocking-time", "TBT"), ("speed-index", "Speed Index")]:
            v = lh.get("audits", {}).get(k_, {}).get("displayValue")
            if v: print(f"  {lbl}: {v}")
    except Exception:
        print("PSI indisponibil (rate-limit fara cheie sau eroare). CWV: de masurat manual.")
    print()
    print("================ FINAL COLECTARE ================")

if __name__ == "__main__":
    main()
