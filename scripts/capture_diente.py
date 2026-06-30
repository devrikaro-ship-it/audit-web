from playwright.sync_api import sync_playwright
import json

URL = "https://diente.ro/"

def capture(page, output_path, viewport_width, viewport_height):
    page.set_viewport_size({'width': viewport_width, 'height': viewport_height})
    page.goto(URL, wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=output_path, full_page=False)

def extract_meta(page):
    page.set_viewport_size({'width': 1280, 'height': 800})
    page.goto(URL, wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)

    meta = {}

    # OG image
    og_image = page.locator('meta[property="og:image"]').get_attribute('content') if page.locator('meta[property="og:image"]').count() > 0 else None
    meta['og_image'] = og_image

    # OG title
    og_title = page.locator('meta[property="og:title"]').get_attribute('content') if page.locator('meta[property="og:title"]').count() > 0 else None
    meta['og_title'] = og_title

    # Favicon
    favicon = None
    for sel in ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]']:
        el = page.locator(sel)
        if el.count() > 0:
            favicon = el.first.get_attribute('href')
            break
    meta['favicon'] = favicon

    # H1
    h1s = page.locator('h1').all_text_contents()
    meta['h1'] = h1s

    # Nav links count
    nav_links = page.locator('nav a').count()
    meta['nav_links'] = nav_links

    # Phone numbers visible
    body_text = page.locator('body').inner_text()
    import re
    phones = re.findall(r'(?:\+40|0)[\s.-]?[0-9]{2,3}[\s.-]?[0-9]{3}[\s.-]?[0-9]{3,4}', body_text)
    meta['phones'] = list(set(phones))

    # CTA buttons above fold
    buttons = page.locator('a, button').all()
    cta_candidates = []
    for btn in buttons:
        try:
            box = btn.bounding_box()
            if box and box['y'] < 800 and box['height'] > 0:
                txt = btn.inner_text().strip()
                if txt:
                    cta_candidates.append({'text': txt[:60], 'y': round(box['y']), 'height': round(box['height']), 'width': round(box['width'])})
        except:
            pass
    meta['above_fold_ctas'] = cta_candidates[:15]

    # Check for interstitials / popups
    popup_selectors = ['[class*="popup"]', '[class*="modal"]', '[class*="overlay"]', '[id*="popup"]', '[id*="modal"]']
    popups = []
    for sel in popup_selectors:
        count = page.locator(sel).count()
        if count > 0:
            popups.append({'selector': sel, 'count': count})
    meta['popups'] = popups

    # Logo
    logo = page.locator('img[alt*="logo" i], img[src*="logo" i], [class*="logo"] img').count()
    meta['logo_count'] = logo

    # Font sizes (sample key elements)
    font_sizes = page.evaluate("""() => {
        const elements = document.querySelectorAll('p, span, li, a');
        const sizes = [];
        for (let i = 0; i < Math.min(elements.length, 30); i++) {
            const el = elements[i];
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const fs = parseFloat(window.getComputedStyle(el).fontSize);
                sizes.push(fs);
            }
        }
        return sizes;
    }""")
    meta['font_sizes_sample'] = font_sizes

    # Horizontal scroll check
    has_horiz_scroll = page.evaluate("""() => document.documentElement.scrollWidth > document.documentElement.clientWidth""")
    meta['horizontal_scroll_desktop'] = has_horiz_scroll

    return meta

def check_mobile_scroll(page):
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(URL, wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    has_horiz_scroll = page.evaluate("""() => document.documentElement.scrollWidth > document.documentElement.clientWidth""")

    font_sizes = page.evaluate("""() => {
        const elements = document.querySelectorAll('p, span, li, a, h1, h2, h3');
        const sizes = [];
        for (let i = 0; i < Math.min(elements.length, 50); i++) {
            const el = elements[i];
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const fs = parseFloat(window.getComputedStyle(el).fontSize);
                sizes.push({tag: el.tagName, fs: fs, text: el.textContent.trim().slice(0,40)});
            }
        }
        return sizes;
    }""")

    tap_targets = page.evaluate("""() => {
        const elements = document.querySelectorAll('a, button, input, [role="button"]');
        const small = [];
        for (let el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
                small.push({tag: el.tagName, w: Math.round(rect.width), h: Math.round(rect.height), text: el.textContent.trim().slice(0,40)});
            }
        }
        return small.slice(0, 20);
    }""")

    return {
        'horizontal_scroll_mobile': has_horiz_scroll,
        'font_sizes_mobile': font_sizes,
        'small_tap_targets': tap_targets
    }

with sync_playwright() as p:
    browser = p.chromium.launch()

    # Desktop screenshot
    page = browser.new_page()
    capture(page, '/Users/VladMoloso/seo-audit/screenshots/diente_desktop.png', 1280, 800)
    print("Desktop screenshot saved")

    # Mobile screenshot
    page2 = browser.new_page()
    capture(page2, '/Users/VladMoloso/seo-audit/screenshots/diente_mobile.png', 390, 844)
    print("Mobile screenshot saved")

    # Meta extraction
    page3 = browser.new_page()
    meta = extract_meta(page3)
    print("META:", json.dumps(meta, indent=2, ensure_ascii=False))

    # Mobile checks
    page4 = browser.new_page()
    mobile_data = check_mobile_scroll(page4)
    print("MOBILE:", json.dumps(mobile_data, indent=2, ensure_ascii=False))

    browser.close()
