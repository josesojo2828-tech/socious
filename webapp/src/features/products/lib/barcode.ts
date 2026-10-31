/**
 * EAN-13 helpers (S1): the check digit is the standard modulo-10 over the
 * first twelve digits (odd positions ×1, even positions ×3, counted from the
 * left). Generation picks twelve random digits unless a base is given.
 */

const FIRST_TWELVE = /^\d{12}$/;

export function ean13CheckDigit(first12: string): string {
  if (!FIRST_TWELVE.test(first12)) {
    throw new Error("EAN-13 needs exactly 12 digits for the check digit.");
  }
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const digit = Number(first12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === code[12];
}

/** A valid EAN-13: from the given 12 digits, or twelve random ones. */
export function generateEan13(base12?: string): string {
  let base = base12 ?? "";
  if (!FIRST_TWELVE.test(base)) {
    base = Array.from({ length: 12 }, () =>
      String(Math.floor(Math.random() * 10)),
    ).join("");
  }
  return base + ean13CheckDigit(base);
}
