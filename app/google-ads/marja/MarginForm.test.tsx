import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MarginForm from "./MarginForm";

it("renders synchronized AOV and goods-cost controls with measured provenance", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={500} initialGoodsCost={250} measured action={() => {}} />);
  expect(html).toContain('name="averageOrderValue" value="500"');
  expect(html).toContain('name="goodsCost" value="250"');
  expect(html.match(/type="range"/g)).toHaveLength(2);
  expect(html.match(/type="number"/g)).toHaveLength(2);
  expect(html).toContain("Measured from Purchase conversions in Google Ads");
  expect(html).toContain("20% operating-cost estimate");
  expect(html).toContain("150.00 RON");
  expect(html).toContain("3.33×");
});

it("labels a manual fallback without claiming Google Ads measured the AOV", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={300} initialGoodsCost={150} measured={false} action={() => {}} />);
  expect(html).toContain("Confirm or adjust this estimate");
  expect(html).not.toContain("Measured from Purchase conversions in Google Ads");
});
