/**
 * Normalizes a display name for duplicate-detection lookups: lowercases,
 * strips diacritics, collapses punctuation/whitespace to single spaces, and trims.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
