import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatPoints(points: number) {
  return `${points} pt${points === 1 ? "" : "s"}`;
}

export function todayString(timezone?: string) {
  if (timezone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  return format(new Date(), "yyyy-MM-dd");
}

export function todayInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDisplayDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function getContrastText(hex: string): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#ffffff";
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1f2937" : "#ffffff";
}

export function ageRangeLabel(minAge?: number | null, maxAge?: number | null) {
  if (minAge != null && maxAge != null) return `${minAge}–${maxAge} yrs`;
  if (minAge != null) return `${minAge}+ yrs`;
  if (maxAge != null) return `≤${maxAge} yrs`;
  return "All ages";
}

export function isChoreAgeAppropriate(
  childAge: number | null | undefined,
  minAge?: number | null,
  maxAge?: number | null
) {
  if (childAge == null) return true;
  if (minAge != null && childAge < minAge) return false;
  if (maxAge != null && childAge > maxAge) return false;
  return true;
}

export const CHILD_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];
