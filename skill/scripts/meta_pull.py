#!/usr/bin/env python3
"""
meta_pull.py — audit CALD Meta, prin Graph API (System User token).
Merge si cand MCP e dezactivat pe cont ("not enabled for Ads MCP").

Ruleaza:  python scripts/meta_pull.py <act_id>  [--token PATH] [--days-preset maximum]
  <act_id> = numeric sau act_xxxxx
  token implicit: ~/.config/meta-ads/token  (string raw)

READ-ONLY. Scoate: cont, campanii (obiectiv/bid/status/buget), pixeli, insights
campanie cu purchase/value/ROAS (maximum + last_30d) — pt detectarea atribuirii
umflate, obiectivelor gresite si structurii de boosted-posts.
"""
import os, sys, json, ssl, argparse, urllib.request, urllib.parse
from collections import Counter

GVER = "v21.0"
BASE = f"https://graph.facebook.com/{GVER}"
PURCHASE_TYPES = ("purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase")


def _ssl_ctx():
    # macOS / Python.org nu vede certificatele de sistem -> certifi daca exista, altfel fallback.
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx


_CTX = _ssl_ctx()


def get(path, token, **params):
    params["access_token"] = token
    url = f"{BASE}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=60, context=_CTX) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return {"error": json.load(e)}
        except Exception:
            return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}


def purch_val(actions, values):
    p = max([int(float(a["value"])) for a in (actions or []) if a["action_type"] in PURCHASE_TYPES] or [0])
    v = max([float(a["value"]) for a in (values or []) if a["action_type"] in PURCHASE_TYPES] or [0.0])
    return p, v


WRONG_OBJ = ("LINK_CLICKS", "OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS", "MESSAGES")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("act", help="ad account id (numeric sau act_xxx)")
    ap.add_argument("--token", default=os.path.expanduser("~/.config/meta-ads/token"))
    ap.add_argument("--presets", default="maximum,last_30d", help="virgule")
    ap.add_argument("--json", action="store_true",
                    help="iesire structurata (machine-readable) in loc de text — pt consum de catre app/cald")
    a = ap.parse_args()
    JSON = a.json
    def out(*args):
        if not JSON: print(*args)

    token = open(a.token).read().strip()
    act = a.act if a.act.startswith("act_") else f"act_{a.act}"
    result = {"act": act}

    # --- cont ---
    acc = get(act, token, fields="name,account_status,currency,amount_spent,business_name")
    if "error" in acc:
        if JSON: print(json.dumps({"error": acc["error"], "act": act}, ensure_ascii=False)); sys.exit(1)
        print("EROARE cont:", acc["error"]); sys.exit(1)
    spent = float(acc.get("amount_spent", 0)) / 100
    result["account"] = {"name": acc.get("name"), "business": acc.get("business_name"),
                         "status": acc.get("account_status"), "currency": acc.get("currency"),
                         "spend_lifetime": spent}
    out(f"===== {acc.get('name')} ({act}) =====")
    out(f"  business: {acc.get('business_name')} | status: {acc.get('account_status')} | "
        f"{acc.get('currency')} | spend lifetime: {spent:,.0f}")

    # --- campanii (obiectiv/bid/status/buget) ---
    camp = get(f"{act}/campaigns", token,
               fields="name,objective,effective_status,bid_strategy,daily_budget,lifetime_budget",
               limit=200)
    rows = camp.get("data", [])
    obj = Counter(r.get("objective", "?") for r in rows)
    active = [r for r in rows if r.get("effective_status") == "ACTIVE"]
    active_out = []
    out(f"\n  campanii: {len(rows)} | obiective: {dict(obj)}")
    out(f"  ACTIVE acum ({len(active)}):")
    for r in active:
        db = r.get("daily_budget"); lb = r.get("lifetime_budget")
        bud = f"db={int(db)/100:.0f}/zi" if db else (f"lb={int(lb)/100:.0f}" if lb else "buget la adset")
        wrong = r.get("objective") in WRONG_OBJ
        active_out.append({"objective": r.get("objective"), "budget": bud,
                           "name": r.get("name", ""), "wrong_objective": wrong})
        flag = "  <-- OBIECTIV GRESIT (ecom)" if wrong else ""
        out(f"    [{r.get('objective'):18}] {bud:14} | {r.get('name','')[:60]}{flag}")
    result["campaigns"] = {"total": len(rows), "objectives": dict(obj), "active": active_out}

    # --- pixeli ---
    px = get(f"{act}/adspixels", token, fields="name,id,last_fired_time,is_unavailable")
    pixels = [{"id": p.get("id"), "last_fired": p.get("last_fired_time"),
               "name": p.get("name"), "unavailable": p.get("is_unavailable")} for p in px.get("data", [])]
    result["pixels"] = pixels
    result["multiple_pixels"] = len(pixels) > 1
    out("\n  pixeli:")
    for p in pixels:
        out(f"    {p['id']} | last_fired={p['last_fired']} | {p['name']}")
    if len(pixels) > 1:
        out("    ^ ATENTIE: >1 pixel pe cont — verifica daca vreunul e STRAIN (alt brand/domeniu)")

    # --- insights cu purchase/ROAS ---
    result["insights"] = {}
    for preset in [p.strip() for p in a.presets.split(",")]:
        ins = get(f"{act}/insights", token, level="campaign", date_preset=preset,
                  fields="campaign_name,objective,spend,actions,action_values", limit=300)
        data = sorted(ins.get("data", []), key=lambda r: -float(r.get("spend", 0)))
        ts = tp = tv = 0.0
        camp_out = []
        out(f"\n  ==== INSIGHTS {preset} (spend/purchase/ROAS) ====")
        for r in data:
            sp = float(r.get("spend", 0)); ts += sp
            p, v = purch_val(r.get("actions"), r.get("action_values"))
            tp += p; tv += v
            roas = v / sp if sp else 0
            if sp >= 1:
                camp_out.append({"spend": round(sp), "purchases": p, "value": round(v),
                                 "roas": round(roas, 2), "objective": r.get("objective", "?"),
                                 "name": r.get("campaign_name", "")})
                out(f"    {sp:8.0f} | purch={p:3} val={v:9.0f} ROAS={roas:6.2f} | "
                    f"{r.get('objective','?'):18} | {r.get('campaign_name','')[:48]}")
        roas_t = tv / ts if ts else 0
        result["insights"][preset] = {"campaigns": camp_out,
                                      "total": {"spend": round(ts), "purchases": int(tp),
                                                "value": round(tv), "roas": round(roas_t, 2)},
                                      "inflated": roas_t > 15}
        out(f"    ---- TOTAL spend={ts:.0f} purch={int(tp)} val={tv:.0f} ROAS={roas_t:.2f}")
        if roas_t > 15:
            out("    ^^ ROAS blended absurd -> atribuire view-through UMFLATA. "
                "Cross-check GA4 facebook/cpc inainte de orice decizie.")

    if JSON:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
