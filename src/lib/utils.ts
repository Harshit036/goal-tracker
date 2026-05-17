import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeScore(
  uomType: string,
  target: number,
  actual: number | null,
  targetDate?: Date | null,
  actualDate?: Date | null
): number | null {
  if (actual === null || actual === undefined) return null;

  switch (uomType) {
    case "NUMERIC_MIN":
      return target > 0 ? Math.min((actual / target) * 100, 150) : null;
    case "NUMERIC_MAX":
      return actual > 0 ? Math.min((target / actual) * 100, 150) : null;
    case "ZERO":
      return actual === 0 ? 100 : 0;
    case "TIMELINE":
      if (!targetDate || !actualDate) return null;
      const deadline = new Date(targetDate).getTime();
      const completion = new Date(actualDate).getTime();
      if (completion <= deadline) return 100;
      const daysLate = (completion - deadline) / (1000 * 60 * 60 * 24);
      return Math.max(0, 100 - daysLate * 2);
    default:
      return null;
  }
}

export function formatScore(score: number | null): string {
  if (score === null) return "-";
  return `${score.toFixed(1)}%`;
}

export const UOM_LABELS: Record<string, string> = {
  NUMERIC_MIN: "Numeric (Higher is Better)",
  NUMERIC_MAX: "Numeric (Lower is Better)",
  TIMELINE: "Timeline (Date-Based)",
  ZERO: "Zero-Based (Zero = Success)",
};

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  ON_TRACK: "On Track",
  COMPLETED: "Completed",
};

export const QUARTER_LABELS: Record<string, string> = {
  Q1: "Q1 (July)",
  Q2: "Q2 (October)",
  Q3: "Q3 (January)",
  Q4: "Q4 / Annual (March–April)",
};

export const SHEET_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REWORK: "Returned for Rework",
};

export const SHEET_STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REWORK:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
  ON_TRACK:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};
