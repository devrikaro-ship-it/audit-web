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
    expect(view.getByLabelText("Name")).toBeTruthy();
    expect(view.getByText(/use these details once to generate, store, and email this audit/i)).toBeTruthy();
    expect(view.container.textContent).toMatch(/does not enroll me in monthly reports/i);
    expect(view.container.textContent).not.toMatch(/newsletter|promotional materials/i);
    expect(view.getByRole("button", { name: "Email me my PDF audit" })).toBeTruthy();
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/google-ads/portal/client-token"));
    expect(view.getByText("Your PDF audit has been generated, saved, and emailed to you.")).toBeTruthy();
  });

  it("renders recovery and permits retries after rejected and thrown submissions", async () => {
    const action = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: "PDF_FAILED" })
      .mockRejectedValueOnce(new Error("temporary action failure"))
      .mockResolvedValueOnce({ ok: true, deliveryStatus: "EMAIL_SENT", reportId: "r", portalPath: "/google-ads/portal/retry-token" });
    const view = render(<ContactForm action={action} pendingReportReference={"a".repeat(43)} />);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.textContent).toContain("We could not generate your PDF audit"));
    expect(push).not.toHaveBeenCalled();
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(view.container.textContent).toContain("We could not generate your PDF audit");
    expect(view.getByRole("button", { name: "Email me my PDF audit" })).not.toHaveAttribute("disabled");
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/google-ads/portal/retry-token"));
  });

  it("reports an email failure truthfully while preserving the portal destination", async () => {
    const view = render(<ContactForm action={vi.fn().mockResolvedValue({ ok: true, deliveryStatus: "EMAIL_FAILED", reportId: "r", portalPath: "/google-ads/portal/saved-token" })} pendingReportReference={"a".repeat(43)} />);

    fireEvent.submit(view.container.querySelector("form")!);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/google-ads/portal/saved-token"));
    expect(view.getByText("Your PDF audit has been generated and saved, but the email could not be sent.")).toBeTruthy();
    expect(view.container.textContent).not.toMatch(/delayed|queued|later/i);
    expect(view.getByRole("link", { name: "Open my dashboard" }).getAttribute("href")).toBe("/google-ads/portal/saved-token");
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
