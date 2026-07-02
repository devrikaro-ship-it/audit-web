#!/usr/bin/env python3
"""
post_cald.py — trimite un raport CALD (audit cont, date reale) catre app-ul web audit-web,
care il stocheaza si il randeaza nativ la /cald/<slug> (+ PDF). Inlocuieste pasul vechi de
copiat HTML manual in public/cald/ si de editat warm-clients.ts.

Structura JSON-ului = tipul WarmReport din audit-web/lib/warm-report.ts:
  obligatoriu: slug, client, verdict, channels[]
  optional: domain, date, vertical, subtitle, targets, gun, opportunity, proof[],
            quickwins[], google[], google_sub, meta[], meta_sub, plan[]

Ruleaza:  python scripts/post_cald.py raport.json [--base URL] [--token TOKEN]
  --base  implicit: $AUDIT_WEB_URL sau http://localhost:3000
  --token implicit: $CALD_TOKEN sau ~/.config/devrika/cald-token (daca exista)
"""
import os, sys, json, argparse, urllib.request, urllib.error


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", help="cale catre JSON-ul WarmReport")
    ap.add_argument("--base", default=os.environ.get("AUDIT_WEB_URL", "http://localhost:3000"))
    ap.add_argument("--token", default=None)
    a = ap.parse_args()

    with open(a.file, encoding="utf-8") as f:
        report = json.load(f)

    missing = [k for k in ("slug", "client", "verdict", "channels") if not report.get(k)]
    if missing:
        sys.exit(f"EROARE: lipsesc campuri obligatorii: {', '.join(missing)}")

    token = a.token or os.environ.get("CALD_TOKEN")
    if not token:
        tok_path = os.path.expanduser("~/.config/devrika/cald-token")
        if os.path.isfile(tok_path):
            token = open(tok_path).read().strip()

    url = a.base.rstrip("/") + "/api/cald"
    data = json.dumps(report, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"EROARE {e.code}: {e.read().decode('utf-8', 'ignore')}")
    except Exception as e:
        sys.exit(f"EROARE retea: {e}")

    print(f"OK -> {a.base.rstrip('/')}{resp.get('url', '/cald/' + report['slug'])}")


if __name__ == "__main__":
    main()
