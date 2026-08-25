// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactForm from "./ContactForm";

describe("report contact form states", () => {
  it("renders success after an accepted submission", async () => {
    const view = render(<ContactForm action={vi.fn().mockResolvedValue({ ok: true, deliveryStatus: "EMAIL_SENT", reportId: "r" })} reportSnapshot="signed" />);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.querySelector("form")).toBeNull());
  });

  it("renders recovery and permits a retry after a rejected submission", async () => {
    const action = vi.fn().mockResolvedValueOnce({ ok: false, error: "PDF_FAILED" }).mockResolvedValueOnce({ ok: true, deliveryStatus: "EMAIL_SENT", reportId: "r" });
    const view = render(<ContactForm action={action} reportSnapshot="signed" />);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.textContent).toContain("could not generate"));
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.querySelector("form")).toBeNull());
  });
});
