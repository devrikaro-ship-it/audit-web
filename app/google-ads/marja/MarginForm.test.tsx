// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import MarginForm from "./MarginForm";

afterEach(cleanup);

it("renders English AOV and acquisition-cost controls in the selected account currency", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={500} initialGoodsCost={300} measured currencyCode="EUR" action={() => {}} />);
  expect(html).toContain('name="averageOrderValue" value="500"');
  expect(html).toContain('name="goodsCost" value="300"');
  expect(html.match(/type="range"/g)).toHaveLength(2);
  expect(html.match(/type="number"/g)).toHaveLength(1);
  expect(html).toContain("Average order value");
  expect(html).toContain("Measured from Google Ads Purchase conversions");
  expect(html).toContain("Cost of goods per order");
  expect(html).toContain("60%");
  expect(html).toContain("For a 500 EUR order, you pay 300 EUR for goods.");
  expect(html).toContain("fixed 20% estimate for operating costs");
  expect(html).toContain("100.00 EUR");
  expect(html).toContain("5.00×");
});

it("snaps the measured AOV to 50-unit and acquisition-cost to five-percentage-point steps", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={2486} initialGoodsCost={1292.72} measured currencyCode="EUR" action={() => {}} />);

  expect(html).toContain('type="number" min="50"');
  expect(html).toContain('name="averageOrderValue" value="2500"');
  expect(html).toContain('step="50"');
  expect(html).toContain('aria-label="Average order value slider" min="50"');
  expect(html).toContain('aria-label="Cost of goods percentage" min="0" max="75" step="5"');
  expect(html).toContain('value="50"');
  expect(html).toContain('name="goodsCost" value="1250"');
  expect(html).toContain("For a 2,500 EUR order, you pay 1,250 EUR for goods.");
});

it("labels a manual fallback without claiming Google Ads measured the AOV", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={300} initialGoodsCost={150} measured={false} currencyCode="EUR" action={() => {}} />);
  expect(html).toContain("Confirm or adjust this value");
  expect(html).not.toContain("Measured from Google Ads Purchase conversions");
});

it("keeps the acquisition percentage stable when the average order value changes", () => {
  render(<MarginForm initialAverageOrderValue={500} initialGoodsCost={300} measured={false} currencyCode="EUR" action={() => {}} />);

  const averageOrderInput = screen.getByLabelText("Average order value") as HTMLInputElement;
  fireEvent.change(averageOrderInput, { target: { value: "" } });
  expect(averageOrderInput.value).toBe("");
  fireEvent.change(averageOrderInput, { target: { value: "600" } });

  expect(screen.getByText("For a 600 EUR order, you pay 360 EUR for goods.")).toBeTruthy();
  expect((document.querySelector('input[name="goodsCost"]') as HTMLInputElement).value).toBe("360");
});

it("updates the submitted goods cost from the acquisition percentage slider", () => {
  render(<MarginForm initialAverageOrderValue={500} initialGoodsCost={300} measured={false} currencyCode="EUR" action={() => {}} />);

  fireEvent.change(screen.getByLabelText("Cost of goods percentage"), { target: { value: "50" } });

  expect(screen.getByText("For a 500 EUR order, you pay 250 EUR for goods.")).toBeTruthy();
  expect((document.querySelector('input[name="goodsCost"]') as HTMLInputElement).value).toBe("250");
});

it("shows that the report is being built immediately after submission", async () => {
  let finish!: () => void;
  const action = () => new Promise<void>((resolve) => { finish = resolve; });
  render(<MarginForm initialAverageOrderValue={300} initialGoodsCost={180} measured={false} currencyCode="EUR" action={action} />);

  fireEvent.click(screen.getByRole("button", { name: "Build my profitability audit" }));

  expect((await screen.findByRole("button", { name: "Building your report…" })).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("We are reading product performance from your Google Ads account. This may take up to one minute.")).toBeTruthy();
  finish();
});
