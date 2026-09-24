import { describe, expect, it } from "vitest";
import { GET } from "@/app/r/print-fonts/route";

describe("print fonts", () => {
  it("serves every report font face with the font inside, so the PDF never waits on a font download", async () => {
    const css = await (await GET()).text();
    expect(css.match(/@font-face/g)?.length).toBe(6);
    expect(css.match(/url\(data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}\)/g)?.length).toBe(6);
    expect(css).not.toMatch(/url\(\/fonts\//);
  });
});
