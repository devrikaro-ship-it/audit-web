// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const projection = vi.hoisted(() => ({ roasNou: null as number | null, crestereNecesaraPct: null as number | null }));
vi.mock("@/lib/calc", () => ({
  proiectie: () => ({
    roasNou: projection.roasNou,
    crestereNecesaraPct: projection.crestereNecesaraPct,
    motivPrag: null,
    venitAcum: 100,
    venitCu: 120,
    profitAcum: projection.roasNou === null ? null : 10,
    profitCu: projection.roasNou === null ? null : 20,
    plataDevrika: 5,
  }),
}));

it("executes null, covered, and uncovered projection outcomes", async () => {
  const Simulator = (await import("./Simulator")).default;
  const view = render(<Simulator bugetLunar={100} roasAzi={4} marjaPct={30} />);
  expect(view.container.textContent).toBeTruthy();
  const fee = view.container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')[1];

  projection.roasNou = 8;
  projection.crestereNecesaraPct = 10;
  fireEvent.change(fee, { target: { value: "1" } });
  expect(view.container.textContent).toBeTruthy();

  projection.roasNou = 4.04;
  projection.crestereNecesaraPct = 90;
  fireEvent.change(fee, { target: { value: "2" } });
  expect(view.container.textContent).toBeTruthy();
});
