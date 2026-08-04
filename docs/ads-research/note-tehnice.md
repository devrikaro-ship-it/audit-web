# Note tehnice — audit-devrika (ambele moduri)

Detalii de rulare scoase din SKILL.md ca sa ramana router. Se citesc cand chiar rulezi ceva.

## Fallback Python mod RECE (DOAR cand web-ul nu poate crawla — ex Cloudflare/anti-bot)

Calea implicita a modului RECE e app-ul web. Python-ul de mai jos e plasa de siguranta.
`references/scoring.md` + `references/framing.md` descriu **acest fallback**, nu motorul web
(care e autoritativ pe `docs/AUDIT-SPEC.md`).

1. `python scripts/collect.py https://domeniul.ro` — semnale SEO + Ads. La `!!! BLOCKER`, ia
   paginile prin Playwright; daca nici asa nu merge, spune userului ca site-ul blocheaza crawl-ul.
2. Research Shopping/Meta best-effort: `references/google-ads-research.md`,
   `references/meta-ads-research.md`.
3. `python scripts/build.py date.json raport.html` (forma lui `date.json` = `assets/example.json`)
   → `python scripts/html_to_pdf.py raport.html "Audit-Devrika-{client}.pdf"`.
4. Salveaza in `seo-audits/{client}/` (pastreaza si JSON-ul).

Model de referinta: `seo-audits/sndeco/`.

## Runtime

- **Chart.js headless** se randeaza prin `--virtual-time-budget` (deja in `html_to_pdf.py`).
  Nu schimba.
- Scripturile Python din acest skill sunt cross-platform, fara dependinte: `python` / `python3`.
- `meta_pull.py` foloseste tokenul System User din `~/.config/meta-ads/token` (Graph API — merge
  si cand MCP-ul e dezactivat pe cont).
- Scripturile `gads_*` cer alt runtime: `~/.claude/skills/seo/.venv/bin/python` + config
  `~/.config/claude-seo/google-ads.yaml`. Detaliu in `audit-google-ads/google-ads/RULES.md`.
- PSI/CrUX rate-limited fara cheie → scrie "viteza de masurat". Nu inventa cifre.

## Model de audit cald

Ultimul `clients/*/AUDIT-*.md`.
