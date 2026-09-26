import { describe, expect, it, vi } from "vitest";
import { evaluateDesign, evaluatePage, rowsFromVerdict, SECTIONS, unmeasuredRows, type VerdictOutput } from "./design-eval";
import type { PageShots } from "./page-render";

const shots: PageShots = { url: "https://clinica.ro/", phoneTop: Buffer.from("p"), desktopTiles: [Buffer.from("d1"), Buffer.from("d2")], text: "Radiografii dentare fara griji", popup: true };
const judge = (grade: "bun" | "de-reglat" | "rau", seen = "titlul 'Radiografii dentare fara griji'") => ({ grade, seen, problem: grade === "bun" ? "" : "Vizitatorul pleaca.", fix: grade === "bun" ? "" : "Pune un buton de programare." });
const verdict = (over: Partial<VerdictOutput> = {}): VerdictOutput => ({
  sections: SECTIONS.leads.home!.map((s) => ({ id: s.id, present: s.id !== "echipa", seen: s.id === "proces" ? "" : `sectiunea ${s.id}` })),
  hero_first: true, design: judge("bun"), content: judge("rau"), ...over,
});
const row = (rows: ReturnType<typeof rowsFromVerdict>, id: string) => rows.find((r) => r.id === id)!;

describe("rowsFromVerdict", () => {
  it("turns the model's verdict into rows: present, missing, without evidence, and the two judgements", () => {
    const rows = rowsFromVerdict("leads", "home", verdict());
    expect(row(rows, "st_leads_home_hero")).toMatchObject({ ok: 1, total: 1, evaluated: true });
    expect(row(rows, "st_leads_home_echipa")).toMatchObject({ ok: 0, total: 1 });
    expect(row(rows, "st_leads_home_proces")).toMatchObject({ verify: true });
    expect(row(rows, "ai_home_design")).toMatchObject({ ok: 1, ai: { grade: "bun" } });
    expect(row(rows, "ai_home_content")).toMatchObject({ ok: 0, ai: { grade: "rau", fix: "Pune un buton de programare." } });
    expect(rows).toHaveLength(SECTIONS.leads.home!.length + 2);
  });
  it("fails the first-screen section when it is not the first thing on the page", () => {
    expect(row(rowsFromVerdict("leads", "home", verdict({ hero_first: false })), "st_leads_home_hero")).toMatchObject({ ok: 0 });
  });
  it("makes a judgement without evidence 'de verificat'", () => {
    expect(row(rowsFromVerdict("leads", "home", verdict({ design: judge("rau", "  ") })), "ai_home_design")).toMatchObject({ verify: true });
  });
});

describe("evaluatePage", () => {
  const client = (answer: () => Promise<unknown>) => { const parse = vi.fn(answer); return { client: { beta: { messages: { parse } } } as never, parse }; };
  it("sends the screenshots and a prompt with the page type's sections, the signs and the popup, and reads the answer", async () => {
    const { client: c, parse } = client(async () => ({ stop_reason: "end_turn", parsed_output: verdict() }));
    const rows = await evaluatePage(c, "leads", "home", shots);
    const req = parse.mock.calls[0][0] as { model: string; fallbacks: string; messages: { content: { type: string; text?: string }[] }[] };
    expect(req.model).toBe("claude-opus-5");
    expect(req.fallbacks).toBe("default");
    const content = req.messages[0].content;
    expect(content.filter((b) => b.type === "image")).toHaveLength(3);
    const text = content.find((b) => b.type === "text")!.text!;
    for (const s of SECTIONS.leads.home!) expect(text).toContain(`- ${s.id}: ${s.what}`);
    expect(text).toContain("A window covered the page after it opened: yes");
    expect(text).toContain("Radiografii dentare fara griji");
    expect(row(rows, "ai_home_design")).toMatchObject({ ok: 1 });
  });
  it("leaves every row 'de verificat' on a refusal, an error, or a page that could not be photographed", async () => {
    const all = unmeasuredRows("leads", "home");
    expect(await evaluatePage(client(async () => ({ stop_reason: "refusal", parsed_output: verdict() })).client, "leads", "home", shots)).toEqual(all);
    expect(await evaluatePage(client(async () => { throw new Error("overloaded"); }).client, "leads", "home", shots)).toEqual(all);
    const { client: c, parse } = client(async () => ({}));
    expect(await evaluatePage(c, "leads", "home", null)).toEqual(all);
    expect(parse).not.toHaveBeenCalled();
    expect(all.every((r) => r.verify && r.evaluated)).toBe(true);
  });
});

describe("evaluateDesign", () => {
  it("is off without an API key or a browser, and judges each page type read otherwise", async () => {
    const c = { beta: { messages: { parse: vi.fn(async () => ({ stop_reason: "end_turn", parsed_output: { ...verdict(), sections: [] } })) } } } as never;
    const render = vi.fn(async (_chrome: string, urls: string[]) => urls.map(() => shots));
    expect(await evaluateDesign("leads", { home: "https://clinica.ro/" }, { client: null, chrome: "/chrome", render })).toBeNull();
    expect(await evaluateDesign("leads", { home: "https://clinica.ro/" }, { client: c, chrome: null, render })).toBeNull();
    const out = await evaluateDesign("leads", { home: "https://clinica.ro/", serviciu: "https://clinica.ro/s/", contact: undefined }, { client: c, chrome: "/chrome", render });
    expect([...out!.keys()]).toEqual(["home", "serviciu"]);
    expect(render.mock.calls[0][1]).toEqual(["https://clinica.ro/", "https://clinica.ro/s/"]);
    expect(out!.get("serviciu")!.some((r) => r.id === "ai_serviciu_content")).toBe(true);
  });
});
