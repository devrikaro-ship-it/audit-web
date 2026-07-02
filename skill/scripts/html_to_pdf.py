#!/usr/bin/env python3
"""Converteste un HTML stilizat (A4) in PDF via Chrome/Chromium/Edge headless.
Cross-platform: Windows, macOS, Linux. Fara dependinte (doar stdlib).
Garda: refuza daca au ramas {{TOKEN}}-uri necompletate.
Usage: python html_to_pdf.py input.html output.pdf
"""
import os, re, sys, subprocess, shutil, platform

def find_chrome():
    names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge", "microsoft-edge"]
    for n in names:
        p = shutil.which(n)
        if p:
            return p
    sys_ = platform.system()
    cands = []
    if sys_ == "Darwin":
        cands = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 "/Applications/Chromium.app/Contents/MacOS/Chromium",
                 "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
    elif sys_ == "Windows":
        pf = os.environ.get("ProgramFiles", r"C:\Program Files")
        pf86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        la = os.environ.get("LOCALAPPDATA", "")
        cands = [pf + r"\Google\Chrome\Application\chrome.exe",
                 pf86 + r"\Google\Chrome\Application\chrome.exe",
                 (la + r"\Google\Chrome\Application\chrome.exe") if la else "",
                 pf86 + r"\Microsoft\Edge\Application\msedge.exe",
                 pf + r"\Microsoft\Edge\Application\msedge.exe"]
    else:  # Linux
        cands = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium"]
    for c in cands:
        if c and os.path.isfile(c):
            return c
    return None

def main():
    if len(sys.argv) < 3:
        sys.exit("usage: python html_to_pdf.py input.html output.pdf")
    html, out = sys.argv[1], sys.argv[2]
    if not os.path.isfile(html):
        sys.exit(f"EROARE: fisierul {html} nu exista.")

    src = open(html, encoding="utf-8", errors="ignore").read()
    leftover = sorted(set(re.findall(r"\{\{[A-Z_0-9]+\}\}", src)))
    if leftover:
        sys.stderr.write("EROARE: au ramas tokens necompletate in " + html + ":\n")
        sys.stderr.write("\n".join(leftover) + "\n")
        sys.exit(1)

    chrome = find_chrome()
    if not chrome:
        sys.exit("EROARE: Chrome/Chromium/Edge negasit. Instaleaza Google Chrome.")

    abs_html = os.path.abspath(html)
    file_url = "file://" + abs_html if platform.system() != "Windows" else "file:///" + abs_html.replace("\\", "/")
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
           "--virtual-time-budget=10000", "--print-to-pdf=" + os.path.abspath(out), file_url]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.isfile(out):
        kb = os.path.getsize(out) // 1024
        print(f"PDF generat: {out} ({kb} KB)")
    else:
        sys.exit("EROARE: PDF nu a fost generat.")

if __name__ == "__main__":
    main()
