import { describe, it, expect } from "vitest";
import { publicOrigin, publicUrl } from "./public-url";

const cerere = (url: string, antete: Record<string, string> = {}) => ({
  url,
  headers: new Headers(antete),
});

describe("originea publica a aplicatiei", () => {
  it("in spatele proxy-ului nu se ia dupa adresa vazuta de container", () => {
    // Cazul din productie (Coolify): proxy-ul trimite mai departe cu Host: localhost:3000,
    // iar un redirect construit din req.url ajunge la un localhost care nu exista la client.
    const req = cerere("https://localhost:3000/api/google-ads/callback?code=x");
    const env = { GADS_REDIRECT_URI: "https://audit.devrika.ro/api/google-ads/callback" };
    expect(publicOrigin(req, env)).toBe("https://audit.devrika.ro");
  });

  it("PUBLIC_URL are ultimul cuvant, cand e setat", () => {
    const req = cerere("https://localhost:3000/x");
    const env = {
      PUBLIC_URL: "https://audit.devrika.ro",
      GADS_REDIRECT_URI: "https://altceva.ro/api/google-ads/callback",
    };
    expect(publicOrigin(req, env)).toBe("https://audit.devrika.ro");
  });

  it("daca proxy-ul isi spune numele, il crede — dar dupa env", () => {
    const req = cerere("http://localhost:3000/x", {
      "x-forwarded-host": "audit.devrika.ro",
      "x-forwarded-proto": "https",
    });
    expect(publicOrigin(req, {})).toBe("https://audit.devrika.ro");
  });

  it("pe local, fara nimic setat, ramane adresa cererii", () => {
    const req = cerere("http://localhost:3000/api/google-ads/callback");
    expect(publicOrigin(req, {})).toBe("http://localhost:3000");
  });

  it("o valoare stricata in env nu darama fluxul", () => {
    const req = cerere("http://localhost:3000/x");
    expect(publicOrigin(req, { PUBLIC_URL: "nu e un url" })).toBe("http://localhost:3000");
  });

  it("un env ramas pe localhost nu muta cererea de pe portul ei", () => {
    // Demo pornit pe 3100, dar .env.local are inca adresa de intoarcere pe 3000.
    const req = cerere("http://localhost:3100/api/google-ads/start");
    const env = { GADS_REDIRECT_URI: "http://localhost:3000/api/google-ads/callback" };
    expect(publicOrigin(req, env)).toBe("http://localhost:3100");
  });

  it("construieste calea intreaga, cu tot cu parametri", () => {
    const req = cerere("https://localhost:3000/api/google-ads/callback");
    const env = { PUBLIC_URL: "https://audit.devrika.ro" };
    expect(publicUrl(req, "/google-ads/connect?eroare=anulat", env)).toBe(
      "https://audit.devrika.ro/google-ads/connect?eroare=anulat"
    );
  });
});
