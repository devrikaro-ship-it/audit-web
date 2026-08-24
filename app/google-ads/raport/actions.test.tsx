import { expect, it, vi } from "vitest";

const saveLeadSafe = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("@/lib/gads-session", () => ({
  SESSION_COOKIE: "session",
  unseal: () => ({ customerId: "123", customerName: "Account", marginPct: 28 }),
}));
vi.mock("@/lib/gads-leads", () => ({ saveLeadSafe }));

import { salveazaContact } from "./actions";

it("normalizes absent and oversized contact fields before persistence", async () => {
  const form = new FormData();
  form.set("nume", "n".repeat(140));
  form.set("email", "e".repeat(180));
  await expect(salveazaContact(form)).resolves.toEqual({ ok: true });
  expect(saveLeadSafe).toHaveBeenCalledWith({
    nume: "n".repeat(120),
    email: "e".repeat(160),
    telefon: "",
    customerId: "123",
    customerName: "Account",
    marginPct: 28,
  });

  saveLeadSafe.mockClear();
  await expect(salveazaContact(new FormData())).resolves.toEqual({ ok: true });
  expect(saveLeadSafe).toHaveBeenCalledWith(expect.objectContaining({ nume: "", email: "", telefon: "" }));
});
