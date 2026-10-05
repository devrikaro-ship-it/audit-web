import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportSurface, reportGuards } from "./report-contract";

const render = (id: Parameters<typeof ReportSurface>[0]["id"], when: boolean) =>
  renderToStaticMarkup(<ReportSurface id={id} when={when}><span>visible</span></ReportSurface>);

it("renders count-guarded surfaces at one and many but not zero", () => {
  const cases = [
    ["catalog-map", reportGuards.catalogMap],
    ["account-settings", reportGuards.accountSettings],
    ["unsupported-conclusions", reportGuards.unsupportedConclusions],
  ] as const;
  for (const [id, guard] of cases) {
    expect(render(id, guard(0))).toBe("");
    expect(render(id, guard(1))).toContain(`data-report-surface="${id}"`);
    expect(render(id, guard(7))).toContain(`data-report-surface="${id}"`);
  }
});

it("renders the simulator only with structure and positive return", () => {
  expect(render("simulator-call-to-action", reportGuards.simulator(false, 1))).toBe("");
  expect(render("simulator-call-to-action", reportGuards.simulator(true, 0))).toBe("");
  expect(render("simulator-call-to-action", reportGuards.simulator(true, 1))).toContain("data-report-surface");
  expect(render("simulator-call-to-action", reportGuards.simulator(true, 7))).toContain("data-report-surface");
});
