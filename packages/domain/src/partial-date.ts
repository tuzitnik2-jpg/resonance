export type ReleasePrecision = "year" | "month" | "day";

export interface PartialDate {
  year: number;
  month?: number;
  day?: number;
  precision: ReleasePrecision;
}

export function toPartialDate(
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): PartialDate | null {
  if (year == null) return null;
  if (day != null && month != null) {
    return { year, month, day, precision: "day" };
  }
  if (month != null) {
    return { year, month, precision: "month" };
  }
  return { year, precision: "year" };
}

export function formatPartialDate(date: PartialDate | null): string | null {
  if (!date) return null;
  const y = String(date.year).padStart(4, "0");
  if (date.precision === "day" && date.month != null && date.day != null) {
    return `${y}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  }
  if (date.precision === "month" && date.month != null) {
    return `${y}-${String(date.month).padStart(2, "0")}`;
  }
  return y;
}
