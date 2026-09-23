// The funnel asks for the country code separately; the stored number must carry it, or a UK lead is saved as a
// bare local number. A leading trunk 0 is dropped after the code (+40 0740... -> +40 740...).
export function withCountryCode(code: string, number: string): string {
  const digits = number.replace(/[^\d]/g, "");
  if (!digits) return "";
  const cc = code.trim();
  if (!/^\+\d{1,4}$/.test(cc)) return number.trim();
  const local = digits.replace(/^0+/, "");
  return `${cc} ${local}`;
}
