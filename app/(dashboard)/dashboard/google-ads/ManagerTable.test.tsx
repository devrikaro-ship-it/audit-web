// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { ManagerAccount } from "@/lib/gads-manager";
import ManagerTable from "./ManagerTable";

afterEach(cleanup);

it("searches contact details across the registered population and restores rows after a no-match search", () => {
  const common: ManagerAccount = { id: "one", customerId: "111", name: "First store", website: "", contact: { name: "Alice", email: "alice@example.test", phone: "123456" }, reporting: "Inactive", reportCount: 1, available: true, generatedAt: "2026-08-31T12:00:00Z", period: null, currency: "GBP", roas: 6, minimumRoas: 5, cpa: 10, maximumCpa: 20 };
  render(<ManagerTable accounts={[common, { ...common, id: "two", name: "Second store", contact: { name: "Bob", email: "bob@example.test", phone: "987654" } }]} />);
  expect(screen.getAllByRole("row")).toHaveLength(3);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "BOB@EXAMPLE" } });
  expect(screen.getAllByRole("row")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Second store" }).getAttribute("href")).toBe("/dashboard/google-ads/reports/two");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "not-found" } });
  expect(screen.getAllByRole("row")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getAllByRole("row")).toHaveLength(3);
});
