import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const listLeads = vi.hoisted(() => vi.fn(async () => [{ id: "lead-1", reportId: "report-1", reportToken: "secret-token", pdfPath: "/data/report.pdf" }]));
vi.mock("@/lib/gads-leads", () => ({ listLeads }));
vi.mock("node:fs/promises", () => ({ readFile: async () => Buffer.from("%PDF-test") }));

import { GET } from "./route";

it("serves only the stored PDF whose access token matches", async () => {
  const denied = await GET(new NextRequest("https://audit.example/api/google-ads/reports/report-1?token=wrong"), { params: Promise.resolve({ id: "report-1" }) });
  expect(denied.status).toBe(404);
  const allowed = await GET(new NextRequest("https://audit.example/api/google-ads/reports/report-1?token=secret-token"), { params: Promise.resolve({ id: "report-1" }) });
  expect(allowed.status).toBe(200);
  expect(allowed.headers.get("content-type")).toBe("application/pdf");
  expect(await allowed.text()).toBe("%PDF-test");
});
