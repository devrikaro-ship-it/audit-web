// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactForm from "./ContactForm";

describe("report contact form states", () => {
  it("renders success after an accepted submission", async () => {
    const view = render(<ContactForm action={vi.fn().mockResolvedValue({ ok: true })} />);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.querySelector("form")).toBeNull());
  });

  it("renders recovery and permits a retry after a rejected submission", async () => {
    const action = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(undefined);
    const view = render(<ContactForm action={action} />);
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.querySelector('a[href^="mailto:"]')).not.toBeNull());
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(view.container.querySelector("form")).toBeNull());
  });
});
