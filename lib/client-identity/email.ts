export class InvalidClientEmailError extends Error {
  constructor() {
    super("Invalid email");
    this.name = "InvalidClientEmailError";
  }
}

export function canonicalClientEmail(value: string): string {
  const canonical = value.normalize("NFC").trim().toLowerCase();
  if (canonical.length < 3 || canonical.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(canonical)) {
    throw new InvalidClientEmailError();
  }
  return canonical;
}
