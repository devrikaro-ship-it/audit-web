import html, json, sys

if len(sys.argv) != 4:
    sys.exit('usage: build.py template.html data.json report.html')
tpl = open(sys.argv[1], encoding='utf-8').read()
data = json.load(open(sys.argv[2], encoding='utf-8'))
missing = [k for k in ('name', 'site', 'date', 'foot', 'ctxIntro', 'NOTE_GA4', 'P', 'TOP', 'MT', 'CTX', 'CTXK') if k not in data]
if missing:
    sys.exit('data is missing: ' + ', '.join(missing))
js = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
out = tpl.replace('/*DATA*/null/*END*/', js, 1).replace('<title>Shop audit</title>', '<title>Audit ' + html.escape(data['name']) + '</title>', 1)
open(sys.argv[3], 'w', encoding='utf-8').write(out)
