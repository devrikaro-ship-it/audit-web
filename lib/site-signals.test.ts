import { describe, it, expect } from "vitest";
import { detectPlatform, detectEcom } from "./site-signals";

describe("detectPlatform", () => {
  it.each([
    ["MerchantPro", '<img src="https://e.cdnmp.net/1/a.jpg"><button class="add-to-cart">Adauga in cos</button>'],
    ["GoMag", '<script src="https://gomagcdn.ro/themes/x.js"></script><a class="add_to_cart">'],
    ["PrestaShop", '<link href="/themes/theme_ecolife/assets/css/theme.css"><script>var prestashop = {};</script>'],
    ["OpenCart", '<link href="catalog/view/theme/default/stylesheet.css"><a href="index.php?route=product/product&product_id=1">'],
    ["Magento", '<script type="text/x-magento-init">{"*":{"Magento_Ui/js/core/app":{}}}</script>'],
  ])("recognises %s by its own markers, even with a generic add-to-cart button", (platform, html) => {
    expect(detectPlatform(html)).toBe(platform);
  });

  it("does not call a site Magento because an image path contains mage/", () => {
    expect(detectPlatform('<img src="/wp-content/uploads/image/banner.jpg"><link href="/wp-content/themes/x/s.css">')).toBe("WordPress");
    expect(detectPlatform('<img src="/static/image/banner.jpg">')).toBeNull();
  });

  it("does not call a shop WooCommerce only because it has an add-to-cart button", () => {
    expect(detectPlatform('<button class="add-to-cart">Adauga in cos</button>')).toBeNull();
  });

  it("recunoaste Shopify inaintea WordPress", () => {
    expect(detectPlatform('<script src="https://cdn.shopify.com/x.js">')).toBe("Shopify");
  });
  it("WooCommerce (nu WordPress) cand exista markeri woo", () => {
    expect(detectPlatform('<link href="/wp-content/plugins/woocommerce/style.css">')).toBe("WooCommerce");
  });
  it("WordPress generic cand nu e woo", () => {
    expect(detectPlatform('<link href="/wp-content/themes/x/style.css">')).toBe("WordPress");
  });
  it("null cand nu recunoaste nimic", () => {
    expect(detectPlatform("<html><body>salut</body></html>")).toBeNull();
  });
  it("case-insensitive (functioneaza si pe corpus lowercased)", () => {
    expect(detectPlatform('cdn.shopify.com')).toBe("Shopify");
    expect(detectPlatform('shopify.theme')).toBe("Shopify");
  });
});

describe("detectEcom", () => {
  it("true pentru platforma ecom", () => {
    expect(detectEcom('cdn.shopify.com')).toBe(true);
    expect(detectEcom('woocommerce')).toBe(true);
  });
  it("true pe semnale de cos chiar fara platforma", () => {
    expect(detectEcom('<button>Adauga in cos</button>')).toBe(true);
    expect(detectEcom('<a href="/checkout">')).toBe(true);
  });
  it("false pentru site de prezentare", () => {
    expect(detectEcom('<div class="wp-content">blog despre noi</div>', "WordPress")).toBe(false);
  });
});
