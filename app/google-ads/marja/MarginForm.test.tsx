// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import MarginForm from "./MarginForm";

afterEach(cleanup);

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

it("shows that the report is being built immediately after submission", async () => {
  let finish!: () => void;
  const action = () => new Promise<void>((resolve) => { finish = resolve; });
  render(<MarginForm initialAverageOrderValue={300} initialGoodsCost={180} measured={false} action={action} />);

  fireEvent.click(screen.getByRole("button", { name: "Build my profitability audit" }));

  expect((await screen.findByRole("button", { name: "Building your report…" })).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("We are reading the product data from your Google Ads account. This can take up to one minute.")).toBeTruthy();
  finish();
});
