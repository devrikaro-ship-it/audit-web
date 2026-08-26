// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import MarginForm from "./MarginForm";

afterEach(cleanup);

it("renders Romanian AOV and acquisition-cost percentage controls with measured provenance", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={500} initialGoodsCost={300} measured action={() => {}} />);
  expect(html).toContain('name="averageOrderValue" value="500"');
  expect(html).toContain('name="goodsCost" value="300"');
  expect(html.match(/type="range"/g)).toHaveLength(2);
  expect(html.match(/type="number"/g)).toHaveLength(1);
  expect(html).toContain("Valoarea medie a unei comenzi");
  expect(html).toContain("Măsurată din conversiile Purchase din Google Ads");
  expect(html).toContain("Cât te costă marfa dintr-o comandă");
  expect(html).toContain("60%");
  expect(html).toContain("La o comandă de 500 RON, tu plătești 300 RON pe marfă.");
  expect(html).toContain("estimare fixă de 20% pentru costurile operaționale");
  expect(html).toContain("100,00 RON");
  expect(html).toContain("5,00×");
});

it("snaps the measured AOV to 50 RON and acquisition cost to five percentage point steps", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={2486} initialGoodsCost={1292.72} measured action={() => {}} />);

  expect(html).toContain('type="number" min="50"');
  expect(html).toContain('name="averageOrderValue" value="2500"');
  expect(html).toContain('step="50"');
  expect(html).toContain('aria-label="Bara pentru valoarea medie a comenzii" min="50"');
  expect(html).toContain('aria-label="Procentul costului de achiziție" min="0" max="75" step="5"');
  expect(html).toContain('value="50"');
  expect(html).toContain('name="goodsCost" value="1250"');
  expect(html).toContain("La o comandă de 2.500 RON, tu plătești 1.250 RON pe marfă.");
});

it("labels a manual fallback without claiming Google Ads measured the AOV", () => {
  const html = renderToStaticMarkup(<MarginForm initialAverageOrderValue={300} initialGoodsCost={150} measured={false} action={() => {}} />);
  expect(html).toContain("Confirmă sau ajustează această valoare");
  expect(html).not.toContain("Măsurată din conversiile Purchase din Google Ads");
});

it("keeps the acquisition percentage stable when the average order value changes", () => {
  render(<MarginForm initialAverageOrderValue={500} initialGoodsCost={300} measured={false} action={() => {}} />);

  const averageOrderInput = screen.getByLabelText("Valoarea medie a comenzii") as HTMLInputElement;
  fireEvent.change(averageOrderInput, { target: { value: "" } });
  expect(averageOrderInput.value).toBe("");
  fireEvent.change(averageOrderInput, { target: { value: "600" } });

  expect(screen.getByText("La o comandă de 600 RON, tu plătești 360 RON pe marfă.")).toBeTruthy();
  expect((document.querySelector('input[name="goodsCost"]') as HTMLInputElement).value).toBe("360");
});

it("updates the submitted goods cost from the acquisition percentage slider", () => {
  render(<MarginForm initialAverageOrderValue={500} initialGoodsCost={300} measured={false} action={() => {}} />);

  fireEvent.change(screen.getByLabelText("Procentul costului de achiziție"), { target: { value: "50" } });

  expect(screen.getByText("La o comandă de 500 RON, tu plătești 250 RON pe marfă.")).toBeTruthy();
  expect((document.querySelector('input[name="goodsCost"]') as HTMLInputElement).value).toBe("250");
});

it("shows that the report is being built immediately after submission", async () => {
  let finish!: () => void;
  const action = () => new Promise<void>((resolve) => { finish = resolve; });
  render(<MarginForm initialAverageOrderValue={300} initialGoodsCost={180} measured={false} action={action} />);

  fireEvent.click(screen.getByRole("button", { name: "Construiește auditul meu de profitabilitate" }));

  expect((await screen.findByRole("button", { name: "Construim raportul…" })).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("Citim performanța produselor din contul tău Google Ads. Poate dura până la un minut.")).toBeTruthy();
  finish();
});
