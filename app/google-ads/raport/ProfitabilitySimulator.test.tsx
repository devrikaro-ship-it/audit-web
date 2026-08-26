// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProducts } from "@/lib/gads-product-simulation";
import ProfitabilitySimulator from "./ProfitabilitySimulator";

const analysis = analyzeProducts([
  { productId: "loss", title: "Loss product", cost: 1200, conversionValue: 600, conversions: 2, clicks: 500, impressions: 5000 },
  { productId: "winner", title: "Profitable product", cost: 240, conversionValue: 2400, conversions: 8, clicks: 120, impressions: 1200 },
], { breakEvenRoas: 5, months: 12 });
const snapshot = {
  website: "https://example.com",
  accountName: "Example",
  averageOrderValue: 300,
  goodsCost: 180,
  breakEvenCpa: 60,
  breakEvenRoas: 5,
  current: { spend: 120, revenue: 600, orders: 2, cpa: 60, roas: 5 },
  optimized: { spend: 120, revenue: 900, orders: 3, cpa: 40, roas: 7.5 },
  losses: [],
  opportunities: [],
};

afterEach(cleanup);

describe("profitability report simulator", () => {
  it("renders the original report concept as one ordered report shell", () => {
    const { container } = render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);

    expect(container.querySelector('[data-report-concept="original"]')).toBeTruthy();
    expect(screen.getByText("Contul tău generează vânzări, dar bugetul ajunge la produsele greșite.")).toBeTruthy();
    expect(screen.getByText("Decizia, pe scurt")).toBeTruthy();
    expect(screen.getByText(/Plătești 60 RON pentru o comandă care poate susține maximum 60 RON/)).toBeTruthy();
    expect(screen.getByText("Recuperează bugetul blocat în produsele greșite.")).toBeTruthy();

    const rendered = container.textContent ?? "";
    expect(rendered.indexOf("Decizia, pe scurt")).toBeLessThan(rendered.indexOf("Prioritatea 1 · Oprește pierderile"));
    expect(rendered.indexOf("Prioritatea 1 · Oprește pierderile")).toBeLessThan(rendered.indexOf("Prioritatea 2 · Recuperează creșterea"));
    expect(rendered.indexOf("Prioritatea 2 · Recuperează creșterea")).toBeLessThan(rendered.indexOf("Simulare interactivă · cont optimizat"));
    expect(rendered.indexOf("Simulare interactivă · cont optimizat")).toBeLessThan(rendered.indexOf("Scenariu, nu promisiune"));
  });

  it("shows measured before data and a structurally matching simulated after table", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    expect(screen.getByRole("region", { name: "Comparația profitabilității contului" })).toBeTruthy();
    expect(screen.getByText("Cum ar putea arăta contul după optimizare")).toBeTruthy();
    expect(screen.getByText("Contul actual")).toBeTruthy();
    expect(screen.getAllByText("Optimizat + CSS").length).toBeGreaterThan(0);
    expect(screen.getByText("Prioritatea 1 · Oprește pierderile")).toBeTruthy();
    expect(screen.getByText("Prioritatea 2 · Recuperează creșterea")).toBeTruthy();
    expect(screen.getAllByText((_, element) => element?.classList.contains("source") === true && element.textContent === "Măsurat din Google Ads · ultimele 12 luni")).toHaveLength(2);
    expect(screen.getAllByText("Simulare viitoare")).toHaveLength(2);
    expect(screen.getByText("Înainte: produse măsurate → După: promovare optimizată")).toBeTruthy();
    expect(screen.getByText("Vânzări estimate generate de produsele profitabile de mai jos")).toBeTruthy();
    expect(screen.getAllByText("Produs").length).toBeGreaterThanOrEqual(3);
    for (const heading of ["Clicuri", "Cost", "Comenzi", "CPA", "Vânzări", "ROAS"]) {
      expect(screen.getAllByText(heading).length).toBeGreaterThanOrEqual(3);
    }
    expect(screen.queryByText("Profit after advertising")).toBeNull();
  });

  it("starts at measured monthly spend and updates the after table to zero", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    const slider = screen.getByRole("slider", { name: "Buget lunar simulat" }) as HTMLInputElement;
    expect(Number(slider.value)).toBe(Math.round(analysis.currentMonthlySpend));
    expect(slider.min).toBe("0");
    expect(Number(slider.max)).toBe(analysis.economicBudgetLimit);

    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByTestId("expected-revenue").textContent).toContain("0 RON");
    expect(screen.getByTestId("expected-orders").textContent).toContain("0");
    expect(screen.getByTestId("expected-roas").textContent).toContain("—");
  });

  it("switches the scenario summary between measured and optimized values", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);

    expect(screen.getByTestId("scenario-outcome").textContent).toContain("8× ROAS");
    fireEvent.click(screen.getByRole("tab", { name: "Contul actual" }));
    expect(screen.getByTestId("scenario-outcome").textContent).toContain("5× ROAS");
    expect(screen.getByRole("tab", { name: "Contul actual" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: "Optimizat + CSS" }));
    expect(screen.getByTestId("scenario-outcome").textContent).toContain("8× ROAS");
    expect(screen.getByRole("tab", { name: "Optimizat + CSS" }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows orders, CPA and ROAS as whole numbers throughout the interactive report", () => {
    const { container } = render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    expect(container.textContent).not.toMatch(/\d+[,.]\d+×/);
    expect(container.textContent).not.toContain("40.00 RON");
    expect(container.textContent).toContain("40 RON");
  });

  it("explains the exact three-step strategy and the CSS assumption", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    expect(screen.getByText("1 · Oprește pierderile")).toBeTruthy();
    expect(screen.getByText("2 · Mută bugetul")).toBeTruthy();
    expect(screen.getByText("3 · Crește controlat")).toBeTruthy();
    expect(screen.getAllByText(/reducere estimată de 20% a CPC-ului/i)).toHaveLength(2);
  });

  it("renders a wide report surface instead of the narrow legacy report", () => {
    const { container } = render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    expect(container.firstElementChild?.getAttribute("data-profitability-layout")).toBe("wide-v1");
  });

  it("limits every visible product table to ten compact rows without changing the analyzed population", () => {
    const losses = Array.from({ length: 12 }, (_, index) => ({
      ...analysis.losses[0],
      productId: `loss-${index}`,
      title: `Loss product ${index}`,
      monthlyCost: 1200 - index,
    }));
    const opportunities = Array.from({ length: 12 }, (_, index) => ({
      ...analysis.opportunities[0],
      productId: `winner-${index}`,
      title: `Profitable product ${index}`,
      estimatedSalesOpportunity: 2400 - index,
    }));
    const expandedAnalysis = { ...analysis, losses, opportunities };

    render(<ProfitabilitySimulator analysis={expandedAnalysis} averageOrderValue={300} snapshot={snapshot} />);

    expect(screen.getByRole("table", { name: "Produse care îți consumă bugetul" }).querySelectorAll("tbody tr")).toHaveLength(10);
    expect(screen.getByRole("table", { name: "Produse profitabile care primesc prea puțin trafic" }).querySelectorAll("tbody tr")).toHaveLength(10);
    expect(screen.getByRole("table", { name: "Promovarea optimizată a produselor" }).querySelectorAll("tbody tr")).toHaveLength(10);
    expect(expandedAnalysis.losses).toHaveLength(12);
    expect(expandedAnalysis.opportunities).toHaveLength(12);
  });

  it("shows one consistent twelve-month evidence window in the measured product tables", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);

    const lossRow = screen.getByRole("table", { name: "Produse care îți consumă bugetul" }).querySelector("tbody tr");
    const opportunityRow = screen.getByRole("table", { name: "Produse profitabile care primesc prea puțin trafic" }).querySelector("tbody tr");

    expect(lossRow?.textContent).toContain("1.200 RON");
    expect(lossRow?.textContent).toContain("2");
    expect(lossRow?.textContent).toContain("600 RON");
    expect(lossRow?.textContent).toContain("−1.080 RON");
    expect(opportunityRow?.textContent).toContain("240 RON");
    expect(opportunityRow?.textContent).toContain("8");
    expect(opportunityRow?.textContent).toContain("2.400 RON");
    expect(screen.getAllByText((_, element) => element?.classList.contains("source") === true && element.textContent === "Măsurat din Google Ads · ultimele 12 luni")).toHaveLength(2);
  });
});
