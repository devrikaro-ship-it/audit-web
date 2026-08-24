import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GROSS_MARGIN_MAX, GROSS_MARGIN_MIN, GROSS_MARGIN_STEP } from "@/lib/gads-margin";
import MarginForm from "./MarginForm";

it("uses the shared gross-margin range and preserves a valid decimal", () => {
  const html = renderToStaticMarkup(<MarginForm initial={28.5} action={() => {}} />);
  expect(html).toContain(`min="${GROSS_MARGIN_MIN}"`);
  expect(html).toContain(`max="${GROSS_MARGIN_MAX}"`);
  expect(html).toContain(`step="${GROSS_MARGIN_STEP}"`);
  expect(html).toContain('name="marginPct" value="28.5"');
});
