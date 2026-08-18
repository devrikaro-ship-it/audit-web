import { describe, it, expect } from "vitest";
import { dashCredentials, basicAuthOk } from "./dash-auth";

const antet = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;

describe("credentialele dashboard-ului", () => {
  it("in productie, fara env, nu exista credentiale — dashboard inchis", () => {
    expect(dashCredentials({ NODE_ENV: "production" })).toBeNull();
  });

  it("in productie, cu env, foloseste exact ce e setat pe server", () => {
    expect(dashCredentials({ NODE_ENV: "production", DASH_USER: "u", DASH_PASS: "p" }))
      .toEqual({ user: "u", pass: "p" });
  });

  it("in dezvoltare ramane o pereche locala, ca sa nu blocheze lucrul", () => {
    expect(dashCredentials({ NODE_ENV: "development" })).not.toBeNull();
  });

  it("jumatate de configurare in productie tot inseamna inchis", () => {
    expect(dashCredentials({ NODE_ENV: "production", DASH_USER: "u" })).toBeNull();
  });
});

describe("verificarea antetului Basic", () => {
  const cred = { user: "razvan", pass: "parola:cu:doua_puncte" };

  it("accepta perechea corecta, chiar daca parola contine doua puncte", () => {
    expect(basicAuthOk(antet(cred.user, cred.pass), cred)).toBe(true);
  });

  it("respinge parola gresita", () => {
    expect(basicAuthOk(antet("razvan", "altceva"), cred)).toBe(false);
  });

  it("respinge lipsa antetului si antetul rupt", () => {
    expect(basicAuthOk(null, cred)).toBe(false);
    expect(basicAuthOk("Basic ???", cred)).toBe(false);
    expect(basicAuthOk("Bearer ceva", cred)).toBe(false);
  });

  it("fara credentiale configurate nu trece nimeni", () => {
    expect(basicAuthOk(antet("razvan", "parola:cu:doua_puncte"), null)).toBe(false);
  });
});
