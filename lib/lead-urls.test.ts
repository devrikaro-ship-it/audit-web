import { describe, expect, it } from "vitest";
import { extractInternalLinks, filterUrls } from "./audit-engine";

const O = "https://dentalview.ro";

describe("which links of a page are pages", () => {
  it("follows the links a visitor clicks, not the stylesheets of <link href>", () => {
    const html = '<link rel="stylesheet" href="/wp-content/themes/smilepure/style.css?ver=7.1"><a class="m" href="/radiografie-panoramica/">Panoramica</a>';
    expect(extractInternalLinks(html, O)).toEqual([`${O}/radiografie-panoramica/`]);
  });

  it("leaves out files, also with a version query (style.css?ver=7.1)", () => {
    expect(filterUrls([`${O}/wp-content/plugins/cf7/styles.css?ver=6.1.7`, `${O}/logo.webp`, `${O}/radiografie-dentara/`], O)).toEqual([`${O}/radiografie-dentara/`]);
  });

  it("keeps the contact page for a lead site and leaves it out for a shop", () => {
    expect(filterUrls([`${O}/contact/`, `${O}/despre-noi/`], O, true)).toEqual([`${O}/contact/`]);
    expect(filterUrls([`${O}/contact/`, `${O}/despre-noi/`], O)).toEqual([]);
  });
});
