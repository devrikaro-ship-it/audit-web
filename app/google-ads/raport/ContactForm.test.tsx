// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import ContactForm from "./ContactForm";

describe("report contact form states", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the client portal after an accepted submission", async () => {
    const view = render(<ContactForm action={vi.fn().mockResolvedValue({ ok: true, deliveryStatus: "EMAIL_SENT", reportId: "r", portalPath: "/google-ads/portal/client-token" })} pendingReportReference={"a".repeat(43)} />);
    expect(view.getByLabelText("Nume")).toBeTruthy();
    expect(view.getByText(/monthly campaign reports will be sent to this email/i)).toBeTruthy();
    expect(view.container.textContent).not.toMatch(/newsletter|promotional materials/i);
    expect(view.getByRole("button", { name: "Trimite-mi raportul PDF pe email" })).toBeTruthy();
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/google-ads/portal/client-token"));
  });

  it("renders recovery and permits a retry after a rejected submission", async () => {
    const action = vi.fn().mockResolvedValueOnce({ ok: false, error: "PDF_FAILED" }).mockResolvedValueOnce({ ok: true, deliveryStatus: "EMAIL_SENT", reportId: "r" });
    const view = render(<ContactForm action={action} pendingReportReference={"a".repeat(43)} />);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.textContent).toContain("Nu am putut genera raportul PDF"));
    expect(push).not.toHaveBeenCalled();
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.querySelector("form")).toBeNull());
  });

  it("submits only the fixed-size pending reference and never serializes snapshot bytes", () => {
    const reference = "b".repeat(43);
    const view = render(<ContactForm action={vi.fn()} pendingReportReference={reference} />);
    const form = view.container.querySelector("form")!;
    const hidden = form.querySelector<HTMLInputElement>('input[type="hidden"]');

    expect(hidden?.name).toBe("pendingReportReference");
    expect(hidden?.value).toBe(reference);
    expect(form.querySelector('[name="reportSnapshot"]')).toBeNull();
    expect(new URLSearchParams(new FormData(form) as never).toString().length).toBeLessThan(1_024);
  });
});
