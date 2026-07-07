// Design tokens Devrika — paleta + fonturi, SURSA UNICA.
// Inainte, aceleasi valori hex traiau in report-renderer, warm-report-renderer si
// hardcodate prin pagini. Aici o data: schimbi indigo o data, se schimba peste tot.
// Valorile sunt identice cu paleta PDF-ului Devrika (nu schimba nimic vizual).

export const C = {
  navy: "#13163A", navyMid: "#23265F", indigo: "#47499E", cyan: "#0ABECF",
  white: "#FFFFFF",
  red: "#C0392B", redBg: "#FEF2F2", orange: "#D45B00", orangeBg: "#FFF4E6",
  yellow: "#B45309", yellowBg: "#FFFBEB", green: "#1A7A4A", greenBg: "#F0FFF4",
  gray400: "#8FA3C0", gray500: "#64748b", gray600: "#4A5E7A", gray800: "#1E2D42",
  slate: "#F4F6FB", border: "#E6EBF4",
} as const;

export const sora = "var(--font-sora), system-ui, sans-serif";
export const inter = "var(--font-inter), system-ui, sans-serif";

// Gradientul de brand, folosit pe butoane / accente.
export const brandGradient = `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`;
