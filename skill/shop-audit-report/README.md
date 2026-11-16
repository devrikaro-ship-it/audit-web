# Shop audit report

The one page of a shop audit: score, the most important conclusions, each platform's checklist with its conclusions,
and the unscored Context Analytics section. The rules it shows are in `../conclusions-standard.md`; this folder holds
only the page.

## Build

```
python3 build.py template.html <client>-data.json report.html
```

`build.py` refuses data with a missing field and names it. The client's data file lives in the client's folder,
never here: this repository is public. `example-data.json` is invented and shows the shape.

## Data

| Field | Shape |
|---|---|
| `name`, `site`, `date` | header: "Audit <name>", "<site> · <date>" |
| `foot` | sources line under the report (HTML allowed) |
| `ctxIntro` | intro line of Context Analytics: window and sources |
| `NOTE_GA4` | note under Context Analytics; empty string for none |
| `P` | platforms: `{n, id, src, c: [{n, r: [[verdict, setting, recommended, now, impact]], kw?}], k: [[text, component, verdict, impact]]}` |
| `TOP` | at most five: `[text, platform id, link label, verdict, impact]` |
| `MT` | metrics: `[metric, threshold, now, verdict, impact]` |
| `CTX` | context tables: `{n, h: [headers], r: [[cells]]}` |
| `CTXK` | Context Analytics conclusions, shaped like `P[].k` |

Codes:

1. Checklist verdict: 0 wrong, 1 correct (both scored), 3 approved exception, 4 not applicable (not scored).
2. Conclusion verdict: 0 problem, 1 good, 4 not applicable.
3. Metric verdict: 0 problem, 1 in order, 2 to read, 4 no threshold.
4. Impact: 3 large, 2 medium, 1 small; 0 on a metric with no threshold.

Scores are computed by the page: component = correct of scored rows, platform = mean of its components, total = mean
of the platforms. Tables sort themselves: problems first, large impact to small, then good, then not applicable.

## Publish

The built report is published as a private claude.ai artifact from the client's folder, then captured at 1280 and
390 px with `~/.claude/tools/visual-check/visual-check.py` before it is called done.
